export const MIN_SCHEDULE_INTERVAL_MINUTES = 5
export const MAX_SCHEDULE_INTERVAL_MINUTES = 7 * 24 * 60

export type ScheduleRecurrence =
  | { kind: 'interval'; everyMinutes: number }
  /** `time` is local "HH:MM". `weekdays` uses 0 = Sunday; an empty list means every day. */
  | { kind: 'daily'; time: string; weekdays: number[] }

export type ScheduleRunStatus = 'completed' | 'failed' | 'cancelled' | 'skipped'

export interface Schedule {
  id: string
  scriptId: string
  /** Project whose workspace target (local folder or SSH host) the run uses. Null = default local shell. */
  projectId: string | null
  recurrence: ScheduleRecurrence
  enabled: boolean
  nextRunAt: string | null
  lastRunAt: string | null
  lastStatus: ScheduleRunStatus | null
  createdAt: string
}

export interface SchedulesData {
  schedules: Schedule[]
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

export function isValidScheduleTime(value: string): boolean {
  return TIME_PATTERN.test(value)
}

export function normalizeRecurrence(value: unknown): ScheduleRecurrence | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>

  if (raw.kind === 'interval') {
    const minutes = Math.round(Number(raw.everyMinutes))
    if (!Number.isFinite(minutes)) return null
    return {
      kind: 'interval',
      everyMinutes: Math.min(MAX_SCHEDULE_INTERVAL_MINUTES, Math.max(MIN_SCHEDULE_INTERVAL_MINUTES, minutes))
    }
  }

  if (raw.kind === 'daily') {
    if (typeof raw.time !== 'string' || !isValidScheduleTime(raw.time)) return null
    const weekdays = Array.isArray(raw.weekdays)
      ? [...new Set(raw.weekdays.filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6))].sort()
      : []
    return { kind: 'daily', time: raw.time, weekdays: weekdays.length === 7 ? [] : weekdays }
  }

  return null
}

/** First run time strictly after `from`, in local time. */
export function computeNextRun(recurrence: ScheduleRecurrence, from: Date): Date {
  if (recurrence.kind === 'interval') {
    return new Date(from.getTime() + recurrence.everyMinutes * 60_000)
  }

  const [hours, minutes] = recurrence.time.split(':').map(Number)
  for (let offset = 0; offset <= 7; offset += 1) {
    const candidate = new Date(from.getFullYear(), from.getMonth(), from.getDate() + offset, hours, minutes, 0, 0)
    if (candidate.getTime() <= from.getTime()) continue
    if (recurrence.weekdays.length === 0 || recurrence.weekdays.includes(candidate.getDay())) {
      return candidate
    }
  }
  // Unreachable for normalized input; keeps the type total.
  return new Date(from.getTime() + 24 * 60 * 60_000)
}

/**
 * After the app was closed, runs that came due are skipped, not replayed: the next run is
 * recomputed from `now` whenever the stored one is in the past.
 */
export function resolveNextRunAt(schedule: Schedule, now: Date): string | null {
  if (!schedule.enabled) return null
  if (schedule.nextRunAt && Date.parse(schedule.nextRunAt) > now.getTime()) return schedule.nextRunAt
  return computeNextRun(schedule.recurrence, now).toISOString()
}

export function isScheduleDue(schedule: Schedule, now: Date): boolean {
  return (
    schedule.enabled &&
    schedule.nextRunAt !== null &&
    Date.parse(schedule.nextRunAt) <= now.getTime()
  )
}
