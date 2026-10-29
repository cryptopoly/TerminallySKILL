import { describe, expect, it } from 'vitest'
import {
  computeNextRun,
  isScheduleDue,
  normalizeRecurrence,
  resolveNextRunAt,
  type Schedule
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
