import { BrowserWindow } from 'electron'
import { mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { readJsonFile, writeJsonAtomic } from './atomic-write'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import {
  computeNextRun,
  isScheduleDue,
  normalizeRecurrence,
  resolveNextRunAt,
  type Schedule,
  type SchedulesData,
  type ScheduleRunStatus
} from '../shared/schedule-schema'
import { getDataDir } from './user-data-path'

const TICK_MS = 20_000

let cached: SchedulesData | null = null
let timer: ReturnType<typeof setInterval> | null = null

function getSchedulesFile(): string {
  return join(getDataDir(), 'schedules.json')
}

async function load(): Promise<SchedulesData> {
  if (cached) return cached
  cached = await readJsonFile(
    getSchedulesFile(),
    (value) => {
      const raw = value as Partial<SchedulesData>
      return { schedules: Array.isArray(raw.schedules) ? raw.schedules : [] }
    },
    () => ({ schedules: [] })
  )
  // Runs that came due while the app was closed are skipped, not replayed.
  const now = new Date()
  for (const schedule of cached.schedules) {
    schedule.nextRunAt = resolveNextRunAt(schedule, now)
  }
  return cached
}

async function save(data: SchedulesData): Promise<void> {
  await mkdir(getDataDir(), { recursive: true })
  cached = data
  await writeJsonAtomic(getSchedulesFile(), data)
}

export async function getAllSchedules(): Promise<Schedule[]> {
  return (await load()).schedules
}

export interface ScheduleInput {
  id?: string
  scriptId: string
  projectId: string | null
  recurrence: unknown
  enabled: boolean
}

export async function saveSchedule(input: ScheduleInput): Promise<Schedule> {
  const recurrence = normalizeRecurrence(input.recurrence)
  if (!recurrence) throw new Error('Invalid schedule recurrence')

  const data = await load()
  const now = new Date()
  const existing = input.id ? data.schedules.find((schedule) => schedule.id === input.id) : undefined

  if (existing) {
    const changed =
      JSON.stringify(existing.recurrence) !== JSON.stringify(recurrence) ||
      (input.enabled && !existing.enabled)
    existing.scriptId = input.scriptId
    existing.projectId = input.projectId
    existing.recurrence = recurrence
    existing.enabled = input.enabled
    existing.nextRunAt = input.enabled
      ? changed || !existing.nextRunAt
        ? computeNextRun(recurrence, now).toISOString()
        : existing.nextRunAt
      : null
    await save(data)
    return existing
  }

  const schedule: Schedule = {
    id: randomUUID(),
    scriptId: input.scriptId,
    projectId: input.projectId,
    recurrence,
    enabled: input.enabled,
    nextRunAt: input.enabled ? computeNextRun(recurrence, now).toISOString() : null,
    lastRunAt: null,
    lastStatus: null,
    createdAt: now.toISOString()
  }
  data.schedules.push(schedule)
  await save(data)
  return schedule
}

export async function deleteSchedule(id: string): Promise<void> {
  const data = await load()
  await save({ schedules: data.schedules.filter((schedule) => schedule.id !== id) })
}

export async function deleteSchedulesForScript(scriptId: string): Promise<void> {
  const data = await load()
  const remaining = data.schedules.filter((schedule) => schedule.scriptId !== scriptId)
  if (remaining.length !== data.schedules.length) await save({ schedules: remaining })
}

export async function markScheduleResult(id: string, status: ScheduleRunStatus): Promise<void> {
  const data = await load()
  const schedule = data.schedules.find((entry) => entry.id === id)
  if (!schedule) return
  schedule.lastStatus = status
  await save(data)
}

function pickDeliveryWindow(): BrowserWindow | null {
  return BrowserWindow.getAllWindows().find((win) => !win.isDestroyed()) ?? null
}

async function tick(): Promise<void> {
  const data = await load()
  const now = new Date()
  const due = data.schedules.filter((schedule) => isScheduleDue(schedule, now))
  if (due.length === 0) return

  const win = pickDeliveryWindow()
  for (const schedule of due) {
    schedule.nextRunAt = computeNextRun(schedule.recurrence, now).toISOString()
    schedule.lastRunAt = now.toISOString()
    if (!win) schedule.lastStatus = 'skipped'
  }
  await save(data)

  if (!win) return
  for (const schedule of due) {
    win.webContents.send(IPC_CHANNELS.SCHEDULES_DUE, schedule)
  }
}

/** Schedules run only while the app is open; there is no background service. */
export function startScheduler(): void {
  if (timer) return
  timer = setInterval(() => {
    void tick().catch((error) => console.error('[terminallyskill] Scheduler tick failed:', error))
  }, TICK_MS)
}

export function stopScheduler(): void {
  if (timer) clearInterval(timer)
  timer = null
}
