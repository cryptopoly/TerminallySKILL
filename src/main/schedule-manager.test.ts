import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import type { Schedule, SchedulesData } from '../shared/schedule-schema'

const { mockGetPath, mockGetAllWindows } = vi.hoisted(() => ({
  mockGetPath: vi.fn(),
  mockGetAllWindows: vi.fn()
}))

vi.mock('electron', () => ({
  app: { getPath: mockGetPath },
  BrowserWindow: { getAllWindows: mockGetAllWindows }
}))

import {
  deliverCatchUps,
  getAllSchedules,
  markScheduleResult,
  resetScheduleManagerCache,
  saveSchedule,
  startScheduler,
  stopScheduler
} from './schedule-manager'

function fakeWindow() {
  return { isDestroyed: () => false, webContents: { send: vi.fn() } }
}

describe('schedule-manager history and catch-up', () => {
  let tempDir: string

  async function seed(schedules: Array<Partial<Schedule> & { id: string }>): Promise<void> {
    const full = schedules.map((schedule) => ({
      scriptId: 'script-1',
      projectId: null,
      recurrence: { kind: 'interval', everyMinutes: 30 },
      enabled: true,
      nextRunAt: new Date(Date.now() - 3_600_000).toISOString(),
      lastRunAt: null,
      lastStatus: null,
      createdAt: '2026-10-01T00:00:00.000Z',
      ...schedule
    }))
    await mkdir(join(tempDir, 'data'), { recursive: true })
    await writeFile(join(tempDir, 'data', 'schedules.json'), JSON.stringify({ schedules: full }))
  }

  async function readStored(): Promise<SchedulesData> {
    return JSON.parse(await readFile(join(tempDir, 'data', 'schedules.json'), 'utf8')) as SchedulesData
  }

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'tv-schedules-'))
    mockGetPath.mockReturnValue(tempDir)
    mockGetAllWindows.mockReturnValue([])
    resetScheduleManagerCache()
  })

  afterEach(async () => {
    stopScheduler()
    vi.useRealTimers()
    resetScheduleManagerCache()
    mockGetPath.mockReset()
    mockGetAllWindows.mockReset()
    await rm(tempDir, { recursive: true, force: true })
  })

  it('loads schedules saved before history and catch-up with the defaults', async () => {
    await seed([{ id: 'old', nextRunAt: new Date(Date.now() + 600_000).toISOString() }])
    const [schedule] = await getAllSchedules()
    expect(schedule.catchUp).toBe(false)
    expect(schedule.history).toEqual([])
  })

  it('records a missed run and skips it when catch-up is off', async () => {
    const missedAt = new Date(Date.now() - 3_600_000).toISOString()
    await seed([{ id: 'a', nextRunAt: missedAt }])
    const [schedule] = await getAllSchedules()

    expect(schedule.history).toHaveLength(1)
    expect(schedule.history[0]).toMatchObject({ status: 'missed', at: missedAt, runId: null })
    expect(Date.parse(schedule.nextRunAt as string)).toBeGreaterThan(Date.now())

    const win = fakeWindow()
    await deliverCatchUps(win as never)
    expect(win.webContents.send).not.toHaveBeenCalled()
    // Persisted, so the miss is not recorded a second time on the next launch.
    expect((await readStored()).schedules[0].history).toHaveLength(1)
  })

  it('runs one catch-up per schedule through the first ready window only, never a backlog', async () => {
    await seed([
      { id: 'a', catchUp: true, nextRunAt: new Date(Date.now() - 30 * 24 * 3_600_000).toISOString() },
      { id: 'b', catchUp: false },
      { id: 'c', catchUp: true, enabled: false }
    ])
    const schedules = await getAllSchedules()
    // Nothing fires at load: the window's renderer may not be listening yet.
    expect(schedules.find((s) => s.id === 'a')?.history).toEqual([])

    const first = fakeWindow()
    await deliverCatchUps(first as never)
    expect(first.webContents.send).toHaveBeenCalledTimes(1)
    expect(first.webContents.send.mock.calls[0][1]).toMatchObject({ id: 'a' })

    const stored = (await readStored()).schedules
    const a = stored.find((s) => s.id === 'a') as Schedule
    expect(a.history).toHaveLength(1)
    expect(a.history[0]).toMatchObject({ status: 'running', trigger: 'catch-up' })
    expect(a.lastRunAt).not.toBeNull()
    expect(Date.parse(a.nextRunAt as string)).toBeGreaterThan(Date.now())
    expect(stored.find((s) => s.id === 'b')?.history[0].status).toBe('missed')
    expect(stored.find((s) => s.id === 'c')?.history).toEqual([])

    const second = fakeWindow()
    await deliverCatchUps(second as never)
    expect(second.webContents.send).not.toHaveBeenCalled()
  })

  it('drops a queued catch-up if the schedule was switched off before a window was ready', async () => {
    await seed([{ id: 'a', catchUp: true }])
    await getAllSchedules()
    await saveSchedule({
      id: 'a',
      scriptId: 'script-1',
      projectId: null,
      recurrence: { kind: 'interval', everyMinutes: 30 },
      enabled: true,
      catchUp: false
    })

    const win = fakeWindow()
    await deliverCatchUps(win as never)
    expect(win.webContents.send).not.toHaveBeenCalled()
  })

  it('finishes the in-flight entry with the run id when the renderer reports back', async () => {
    await seed([{ id: 'a', catchUp: true }])
    await getAllSchedules()
    await deliverCatchUps(fakeWindow() as never)

    await markScheduleResult('a', 'completed', { runId: 'wf-123' })
    const [a] = (await readStored()).schedules
    expect(a.lastStatus).toBe('completed')
    expect(a.history).toHaveLength(1)
    expect(a.history[0]).toMatchObject({ status: 'completed', runId: 'wf-123', trigger: 'catch-up' })
  })

  it('keeps only the last 20 entries', async () => {
    await seed([{ id: 'a', nextRunAt: new Date(Date.now() + 600_000).toISOString() }])
    await getAllSchedules()
    for (let i = 0; i < 25; i += 1) {
      await markScheduleResult('a', 'completed', { runId: `wf-${i}` })
    }
    const [a] = (await readStored()).schedules
    expect(a.history).toHaveLength(20)
    expect(a.history[0].runId).toBe('wf-24')
  })

  it('records a skipped run when a scheduled slot comes due with no window open', async () => {
    vi.useFakeTimers()
    await seed([{ id: 'a', nextRunAt: new Date(Date.now() + 60_000).toISOString() }])
    await getAllSchedules()

    startScheduler()
    await vi.advanceTimersByTimeAsync(80_000)
    vi.useRealTimers()

    await vi.waitFor(async () => expect((await readStored()).schedules[0].history).toHaveLength(1))
    const [a] = (await readStored()).schedules
    expect(a.lastStatus).toBe('skipped')
    expect(a.history[0]).toMatchObject({ status: 'skipped', reason: 'no-window', trigger: 'schedule' })
  })

  it('delivers a due slot to the window and marks the entry as running', async () => {
    vi.useFakeTimers()
    const win = fakeWindow()
    mockGetAllWindows.mockReturnValue([win])
    await seed([{ id: 'a', nextRunAt: new Date(Date.now() + 60_000).toISOString() }])
    await getAllSchedules()

    startScheduler()
    await vi.advanceTimersByTimeAsync(80_000)
    vi.useRealTimers()

    await vi.waitFor(() => expect(win.webContents.send).toHaveBeenCalledTimes(1))
    const [a] = (await readStored()).schedules
    expect(a.history[0]).toMatchObject({ status: 'running', trigger: 'schedule' })
  })
})
