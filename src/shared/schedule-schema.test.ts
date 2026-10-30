import { describe, expect, it } from 'vitest'
import {
  MAX_SCHEDULE_HISTORY,
  appendHistory,
  computeNextRun,
  findMissedRun,
  isScheduleDue,
  normalizeRecurrence,
  normalizeStoredSchedule,
  recordRunOutcome,
  resolveNextRunAt,
  type Schedule,
  type ScheduleHistoryEntry
} from './schedule-schema'

function schedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: 's1',
    scriptId: 'script-1',
    projectId: null,
    recurrence: { kind: 'interval', everyMinutes: 30 },
    enabled: true,
    nextRunAt: null,
    lastRunAt: null,
    lastStatus: null,
    createdAt: '2026-10-29T08:00:00.000Z',
    catchUp: false,
    history: [],
    ...overrides
  }
}

describe('normalizeRecurrence', () => {
  it('clamps interval minutes', () => {
    expect(normalizeRecurrence({ kind: 'interval', everyMinutes: 1 })).toEqual({ kind: 'interval', everyMinutes: 5 })
    expect(normalizeRecurrence({ kind: 'interval', everyMinutes: 999999 })).toEqual({ kind: 'interval', everyMinutes: 10080 })
  })

  it('rejects bad daily times and unknown kinds', () => {
    expect(normalizeRecurrence({ kind: 'daily', time: '25:00', weekdays: [] })).toBeNull()
    expect(normalizeRecurrence({ kind: 'cron', expr: '* * * * *' })).toBeNull()
    expect(normalizeRecurrence(null)).toBeNull()
  })

  it('dedupes weekdays and treats all seven as every day', () => {
    expect(normalizeRecurrence({ kind: 'daily', time: '09:30', weekdays: [3, 1, 3, 9] })).toEqual({
      kind: 'daily',
      time: '09:30',
      weekdays: [1, 3]
    })
    expect(normalizeRecurrence({ kind: 'daily', time: '09:30', weekdays: [0, 1, 2, 3, 4, 5, 6] })).toEqual({
      kind: 'daily',
      time: '09:30',
      weekdays: []
    })
  })
})

describe('computeNextRun', () => {
  it('adds the interval', () => {
    const from = new Date(2026, 9, 29, 10, 0, 0)
    expect(computeNextRun({ kind: 'interval', everyMinutes: 45 }, from).getTime()).toBe(from.getTime() + 45 * 60_000)
  })

  it('picks later today when the time has not passed', () => {
    const next = computeNextRun({ kind: 'daily', time: '18:00', weekdays: [] }, new Date(2026, 9, 29, 10, 0))
    expect([next.getDate(), next.getHours(), next.getMinutes()]).toEqual([29, 18, 0])
  })

  it('rolls to tomorrow when the time has passed', () => {
    const next = computeNextRun({ kind: 'daily', time: '09:00', weekdays: [] }, new Date(2026, 9, 29, 10, 0))
    expect(next.getDate()).toBe(30)
  })

  it('skips to the next allowed weekday', () => {
    // 2026-10-29 is a Thursday (4); allow Monday only.
    const next = computeNextRun({ kind: 'daily', time: '09:00', weekdays: [1] }, new Date(2026, 9, 29, 10, 0))
    expect([next.getDay(), next.getDate()]).toEqual([1, 2])
  })
})

describe('resolveNextRunAt and isScheduleDue', () => {
  const now = new Date(2026, 9, 29, 10, 0)

  it('keeps a future run time', () => {
    const future = new Date(now.getTime() + 60_000).toISOString()
    expect(resolveNextRunAt(schedule({ nextRunAt: future }), now)).toBe(future)
  })

  it('skips missed runs by recomputing from now', () => {
    const past = new Date(now.getTime() - 3_600_000).toISOString()
    expect(resolveNextRunAt(schedule({ nextRunAt: past }), now)).toBe(new Date(now.getTime() + 30 * 60_000).toISOString())
  })

  it('has no next run when disabled', () => {
    expect(resolveNextRunAt(schedule({ enabled: false }), now)).toBeNull()
  })

  it('is due only when enabled and the time arrived', () => {
    const past = new Date(now.getTime() - 1000).toISOString()
    expect(isScheduleDue(schedule({ nextRunAt: past }), now)).toBe(true)
    expect(isScheduleDue(schedule({ nextRunAt: past, enabled: false }), now)).toBe(false)
    expect(isScheduleDue(schedule({ nextRunAt: null }), now)).toBe(false)
  })
})

function entry(overrides: Partial<ScheduleHistoryEntry> = {}): ScheduleHistoryEntry {
  return {
    at: '2026-10-29T10:00:00.000Z',
    status: 'running',
    trigger: 'schedule',
    runId: null,
    reason: null,
    ...overrides
  }
}

describe('schedule history', () => {
  const now = new Date('2026-10-29T12:00:00.000Z')

  it('puts the newest entry first and keeps only the last 20', () => {
    let history: ScheduleHistoryEntry[] = []
    for (let i = 0; i < MAX_SCHEDULE_HISTORY + 5; i += 1) {
      history = appendHistory(history, entry({ at: new Date(Date.UTC(2026, 9, 1, i)).toISOString() }))
    }
    expect(history).toHaveLength(MAX_SCHEDULE_HISTORY)
    expect(history[0].at).toBe(new Date(Date.UTC(2026, 9, 1, MAX_SCHEDULE_HISTORY + 4)).toISOString())
    expect(history.at(-1)?.at).toBe(new Date(Date.UTC(2026, 9, 1, 5)).toISOString())
  })

  it('finishes the in-flight entry and attaches the run id', () => {
    const history = [entry({ at: '2026-10-29T10:00:00.000Z' }), entry({ at: '2026-10-29T09:00:00.000Z', status: 'completed' })]
    const next = recordRunOutcome(history, { status: 'completed', runId: 'wf-1' }, now)
    expect(next).toHaveLength(2)
    expect(next[0]).toMatchObject({ status: 'completed', runId: 'wf-1' })
    expect(next[1].status).toBe('completed')
  })

  it('prefers the entry that already has the run id', () => {
    const history = [entry({ at: '2026-10-29T11:00:00.000Z' }), entry({ runId: 'wf-9' })]
    const next = recordRunOutcome(history, { status: 'failed', runId: 'wf-9' }, now)
    expect(next[1]).toMatchObject({ status: 'failed', runId: 'wf-9' })
    expect(next[0].status).toBe('running')
  })

  it('records a skip with its reason', () => {
    const next = recordRunOutcome([entry()], { status: 'skipped', reason: 'busy' }, now)
    expect(next[0]).toMatchObject({ status: 'skipped', reason: 'busy', runId: null })
  })

  it('adds an entry when a result arrives with nothing in flight', () => {
    const next = recordRunOutcome([], { status: 'completed', runId: 'wf-2' }, now)
    expect(next).toEqual([
      { at: now.toISOString(), status: 'completed', trigger: 'schedule', runId: 'wf-2', reason: null }
    ])
  })

  it('does not reuse a finished entry for a later result', () => {
    const history = [entry({ status: 'completed', runId: 'wf-1' })]
    const next = recordRunOutcome(history, { status: 'failed', runId: 'wf-2' }, now)
    expect(next).toHaveLength(2)
    expect(next[0]).toMatchObject({ status: 'failed', runId: 'wf-2' })
  })
})

describe('normalizeStoredSchedule', () => {
  it('upgrades a schedule saved before history and catch-up existed', () => {
    const legacy = {
      id: 'old',
      scriptId: 'script-1',
      projectId: null,
      recurrence: { kind: 'interval', everyMinutes: 30 },
      enabled: true,
      nextRunAt: '2026-10-29T10:00:00.000Z',
      lastRunAt: '2026-10-29T09:30:00.000Z',
      lastStatus: 'completed',
      createdAt: '2026-10-28T08:00:00.000Z'
    }
    expect(normalizeStoredSchedule(legacy)).toEqual({ ...legacy, catchUp: false, history: [] })
  })

  it('keeps catch-up and history, trims to the limit and drops malformed entries', () => {
    const history = [
      ...Array.from({ length: 30 }, (_, i) => entry({ status: 'completed', at: new Date(Date.UTC(2026, 9, 1, i)).toISOString() })),
      { at: 'not a date', status: 'completed' },
      { at: '2026-10-29T10:00:00.000Z', status: 'exploded' },
      null
    ]
    const stored = normalizeStoredSchedule({ ...schedule(), catchUp: true, history })
    expect(stored?.catchUp).toBe(true)
    expect(stored?.history).toHaveLength(MAX_SCHEDULE_HISTORY)
  })

  it('turns a run left in flight by a previous process into an interrupted failure', () => {
    const stored = normalizeStoredSchedule({ ...schedule(), history: [entry({ status: 'running' })] })
    expect(stored?.history[0]).toMatchObject({ status: 'failed', reason: 'interrupted' })
  })

  it('rejects entries that are not schedules', () => {
    expect(normalizeStoredSchedule(null)).toBeNull()
    expect(normalizeStoredSchedule({ id: 'x' })).toBeNull()
    expect(normalizeStoredSchedule({ ...schedule(), recurrence: { kind: 'cron' } })).toBeNull()
  })
})

describe('findMissedRun (catch-up decision)', () => {
  const now = new Date('2026-10-29T12:00:00.000Z')
  const at = (ms: number): string => new Date(now.getTime() + ms).toISOString()

  it('reports nothing while the next run is still ahead', () => {
    expect(findMissedRun(schedule({ nextRunAt: at(60_000) }), now)).toBeNull()
    expect(findMissedRun(schedule({ nextRunAt: at(0) }), now)).not.toBeNull()
  })

  it('reports the stored slot, not a count, however long the app was closed', () => {
    const missedAt = at(-30 * 24 * 3_600_000)
    expect(findMissedRun(schedule({ nextRunAt: missedAt, catchUp: true }), now)).toEqual({ missedAt, catchUp: true })
  })

  it('carries the schedule opt-in: default is skip', () => {
    const missedAt = at(-3_600_000)
    expect(findMissedRun(schedule({ nextRunAt: missedAt }), now)?.catchUp).toBe(false)
  })

  it('ignores disabled schedules and schedules without a stored next run', () => {
    expect(findMissedRun(schedule({ nextRunAt: at(-3_600_000), enabled: false, catchUp: true }), now)).toBeNull()
    expect(findMissedRun(schedule({ nextRunAt: null, catchUp: true }), now)).toBeNull()
    expect(findMissedRun(schedule({ nextRunAt: 'garbage', catchUp: true }), now)).toBeNull()
  })

  it('counts a schedule that never ran: its first slot can be missed', () => {
    const missedAt = at(-60_000)
    expect(findMissedRun(schedule({ nextRunAt: missedAt, lastRunAt: null, lastStatus: null, catchUp: true }), now)).not.toBeNull()
  })

  it('treats a clock that moved backwards as nothing missed', () => {
    // Next run was set from a clock that ran two hours ahead; the clock was then corrected.
    expect(findMissedRun(schedule({ nextRunAt: at(2 * 3_600_000), catchUp: true }), now)).toBeNull()
  })

  it('reports one miss after a forward clock jump over several interval slots', () => {
    const interval = schedule({ nextRunAt: at(-10 * 30 * 60_000), catchUp: true })
    expect(findMissedRun(interval, now)).toEqual({ missedAt: interval.nextRunAt, catchUp: true })
    // After the catch-up fires, the next slot is recomputed from now and is not missed.
    expect(findMissedRun({ ...interval, nextRunAt: resolveNextRunAt(interval, now) }, now)).toBeNull()
  })

  it('works for a daily schedule closed overnight', () => {
    const daily = schedule({
      recurrence: { kind: 'daily', time: '09:00', weekdays: [] },
      nextRunAt: new Date(2026, 9, 29, 9, 0).toISOString(),
      catchUp: true
    })
    expect(findMissedRun(daily, new Date(2026, 9, 29, 21, 0))).not.toBeNull()
    expect(findMissedRun(daily, new Date(2026, 9, 29, 8, 59))).toBeNull()
  })

  it('works for a weekday schedule closed over the weekend', () => {
    // Friday 2026-10-30 09:00 slot; app reopens Sunday. Only the stored Friday slot is reported.
    const weekdays = schedule({
      recurrence: { kind: 'daily', time: '09:00', weekdays: [1, 2, 3, 4, 5] },
      nextRunAt: new Date(2026, 9, 30, 9, 0).toISOString(),
      catchUp: true
    })
    const sunday = new Date(2026, 10, 1, 10, 0)
    expect(findMissedRun(weekdays, sunday)?.missedAt).toBe(weekdays.nextRunAt)
    // The follow-up slot is the next weekday (Monday), not a backlog.
    const next = new Date(resolveNextRunAt(weekdays, sunday) as string)
    expect([next.getDay(), next.getDate()]).toEqual([1, 2])
  })
})
