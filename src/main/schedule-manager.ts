import { BrowserWindow } from 'electron'
import { mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { readJsonFile, writeJsonAtomic } from './atomic-write'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import {
  appendHistory,
  computeNextRun,
  findMissedRun,
  isScheduleDue,
  normalizeRecurrence,
  normalizeStoredSchedule,
  recordRunOutcome,
  resolveNextRunAt,
  type Schedule,
  type ScheduleHistoryReason,
  type ScheduleHistoryTrigger,
  type SchedulesData,
  type ScheduleRunStatus
} from '../shared/schedule-schema'
import { getDataDir } from './user-data-path'

const TICK_MS = 20_000

let cached: SchedulesData | null = null
let timer: ReturnType<typeof setInterval> | null = null
/** Schedules whose missed run should fire once the first window's renderer is ready. */
const pendingCatchUp = new Set<string>()

/** For tests: forget the loaded file and any pending catch-up. */
export function resetScheduleManagerCache(): void {
  cached = null
  pendingCatchUp.clear()
}

function getSchedulesFile(): string {
  return join(getDataDir(), 'schedules.json')
}

async function load(): Promise<SchedulesData> {
  if (cached) return cached
  cached = await readJsonFile(
    getSchedulesFile(),
    (value) => {
      const raw = value as Partial<SchedulesData>
      const schedules = (Array.isArray(raw.schedules) ? raw.schedules : [])
        .map(normalizeStoredSchedule)
        .filter((schedule): schedule is Schedule => schedule !== null)
      return { schedules }
    },
    () => ({ schedules: [] })
  )
  // A run that came due while the app was closed is skipped (recorded as missed), or, for schedules
  // that opted in, queued to run once when the first window is ready. Never a backlog.
  const now = new Date()
  let recorded = false
  for (const schedule of cached.schedules) {
    const missed = findMissedRun(schedule, now)
    if (missed?.catchUp) {
      pendingCatchUp.add(schedule.id)
    } else if (missed) {
      schedule.history = appendHistory(schedule.history, {
        at: missed.missedAt,
        status: 'missed',
        trigger: 'schedule',
        runId: null,
        reason: null
      })
      recorded = true
    }
    schedule.nextRunAt = resolveNextRunAt(schedule, now)
  }
  if (recorded) {
    try {
      await save(cached)
    } catch (error) {
      console.error('[terminallyskill] Failed to persist missed schedule runs:', error)
    }
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
  /** Omitted keeps the stored value (false for a new schedule). */
  catchUp?: boolean
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
    if (typeof input.catchUp === 'boolean') existing.catchUp = input.catchUp
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
    createdAt: now.toISOString(),
    catchUp: input.catchUp === true,
    history: []
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

export async function markScheduleResult(
  id: string,
  status: ScheduleRunStatus,
  details: { runId?: string | null; reason?: ScheduleHistoryReason | null } = {}
): Promise<void> {
  const data = await load()
  const schedule = data.schedules.find((entry) => entry.id === id)
  if (!schedule) return
  schedule.lastStatus = status
  schedule.history = recordRunOutcome(schedule.history, { status, ...details }, new Date())
  await save(data)
}

function pickDeliveryWindow(): BrowserWindow | null {
  return BrowserWindow.getAllWindows().find((win) => !win.isDestroyed()) ?? null
}

/** Marks a schedule as fired now and advances it; the caller sends the due event if there is a window. */
function fire(schedule: Schedule, now: Date, trigger: ScheduleHistoryTrigger, hasWindow: boolean): void {
  schedule.nextRunAt = computeNextRun(schedule.recurrence, now).toISOString()
  schedule.lastRunAt = now.toISOString()
  if (!hasWindow) schedule.lastStatus = 'skipped'
  schedule.history = appendHistory(schedule.history, {
    at: now.toISOString(),
    status: hasWindow ? 'running' : 'skipped',
    trigger,
    runId: null,
    reason: hasWindow ? null : 'no-window'
  })
}

async function tick(): Promise<void> {
  const data = await load()
  const now = new Date()
  const due = data.schedules.filter((schedule) => isScheduleDue(schedule, now))
  if (due.length === 0) return

  const win = pickDeliveryWindow()
  for (const schedule of due) fire(schedule, now, 'schedule', win !== null)
  await save(data)

  if (!win) return
  for (const schedule of due) {
    win.webContents.send(IPC_CHANNELS.SCHEDULES_DUE, schedule)
  }
}

/**
 * Called by a window's renderer once it is listening for due schedules. The first window to
 * report in runs the queued catch-up runs (one per schedule); later windows find nothing queued.
 */
export async function deliverCatchUps(win: BrowserWindow): Promise<void> {
  if (pendingCatchUp.size === 0) return
  const data = await load()
  const ids = [...pendingCatchUp]
  pendingCatchUp.clear()

  const now = new Date()
  const fired = data.schedules.filter(
    (schedule) => ids.includes(schedule.id) && schedule.enabled && schedule.catchUp
  )
  if (fired.length === 0) return
  for (const schedule of fired) fire(schedule, now, 'catch-up', true)
  await save(data)

  for (const schedule of fired) {
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
