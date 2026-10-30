export const MIN_SCHEDULE_INTERVAL_MINUTES = 5
export const MAX_SCHEDULE_INTERVAL_MINUTES = 7 * 24 * 60

export type ScheduleRecurrence =
  | { kind: 'interval'; everyMinutes: number }
  /** `time` is local "HH:MM". `weekdays` uses 0 = Sunday; an empty list means every day. */
  | { kind: 'daily'; time: string; weekdays: number[] }

export type ScheduleRunStatus = 'completed' | 'failed' | 'cancelled' | 'skipped'

/** `running` is in flight; `missed` is a slot that passed while the app was closed (and was not caught up). */
export type ScheduleHistoryStatus = ScheduleRunStatus | 'running' | 'missed'
export type ScheduleHistoryTrigger = 'schedule' | 'catch-up'
export type ScheduleHistoryReason = 'no-window' | 'not-runnable' | 'busy' | 'interrupted'

export const MAX_SCHEDULE_HISTORY = 20

export interface ScheduleHistoryEntry {
  /** When the run fired (or, for `missed`, the slot that was missed). */
  at: string
  status: ScheduleHistoryStatus
  trigger: ScheduleHistoryTrigger
  /** Run record in Runs & Logs, when the workflow actually started. */
  runId: string | null
  reason: ScheduleHistoryReason | null
}

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
  /** Run once at launch (or when the first window opens) if a run was missed while the app was closed. */
  catchUp: boolean
  /** Newest first, at most MAX_SCHEDULE_HISTORY entries. */
  history: ScheduleHistoryEntry[]
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

const RUN_STATUSES: ScheduleRunStatus[] = ['completed', 'failed', 'cancelled', 'skipped']
const HISTORY_STATUSES: ScheduleHistoryStatus[] = [...RUN_STATUSES, 'running', 'missed']
const HISTORY_REASONS: ScheduleHistoryReason[] = ['no-window', 'not-runnable', 'busy', 'interrupted']

function normalizeHistoryEntry(value: unknown): ScheduleHistoryEntry | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (typeof raw.at !== 'string' || Number.isNaN(Date.parse(raw.at))) return null
  if (!HISTORY_STATUSES.includes(raw.status as ScheduleHistoryStatus)) return null
  const status = raw.status as ScheduleHistoryStatus
  const interrupted = status === 'running'
  return {
    at: raw.at,
    // A run still marked running when the file is read belongs to a previous process that never finished it.
    status: interrupted ? 'failed' : status,
    trigger: raw.trigger === 'catch-up' ? 'catch-up' : 'schedule',
    runId: typeof raw.runId === 'string' ? raw.runId : null,
    reason: interrupted
      ? 'interrupted'
      : HISTORY_REASONS.includes(raw.reason as ScheduleHistoryReason)
        ? (raw.reason as ScheduleHistoryReason)
        : null
  }
}

/** Upgrades a stored schedule: schedules saved before history and catch-up existed get the defaults. */
export function normalizeStoredSchedule(value: unknown): Schedule | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<Schedule>
  const recurrence = normalizeRecurrence(raw.recurrence)
  if (typeof raw.id !== 'string' || typeof raw.scriptId !== 'string' || !recurrence) return null
  const history = Array.isArray(raw.history)
    ? raw.history
        .map(normalizeHistoryEntry)
        .filter((entry): entry is ScheduleHistoryEntry => entry !== null)
        .slice(0, MAX_SCHEDULE_HISTORY)
    : []
  return {
    id: raw.id,
    scriptId: raw.scriptId,
    projectId: typeof raw.projectId === 'string' ? raw.projectId : null,
    recurrence,
    enabled: raw.enabled !== false,
    nextRunAt: typeof raw.nextRunAt === 'string' ? raw.nextRunAt : null,
    lastRunAt: typeof raw.lastRunAt === 'string' ? raw.lastRunAt : null,
    lastStatus: RUN_STATUSES.includes(raw.lastStatus as ScheduleRunStatus)
      ? (raw.lastStatus as ScheduleRunStatus)
      : null,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    catchUp: raw.catchUp === true,
    history
  }
}

/** Adds an entry at the front and drops the oldest beyond MAX_SCHEDULE_HISTORY. */
export function appendHistory(
  history: ScheduleHistoryEntry[],
  entry: ScheduleHistoryEntry
): ScheduleHistoryEntry[] {
  return [entry, ...history].slice(0, MAX_SCHEDULE_HISTORY)
}

export interface ScheduleRunOutcome {
  status: ScheduleRunStatus
  runId?: string | null
  reason?: ScheduleHistoryReason | null
}

/**
 * Records how a fired run ended: updates the entry with the same run id, else the newest
 * in-flight entry, else (a due event that never went through the scheduler) adds a new one.
 */
export function recordRunOutcome(
  history: ScheduleHistoryEntry[],
  outcome: ScheduleRunOutcome,
  now: Date
): ScheduleHistoryEntry[] {
  const runId = outcome.runId ?? null
  let index = runId ? history.findIndex((entry) => entry.runId === runId) : -1
  if (index < 0) index = history.findIndex((entry) => entry.status === 'running')

  if (index < 0) {
    return appendHistory(history, {
      at: now.toISOString(),
      status: outcome.status,
      trigger: 'schedule',
      runId,
      reason: outcome.reason ?? null
    })
  }
  const next = [...history]
  next[index] = {
    ...history[index],
    status: outcome.status,
    runId: runId ?? history[index].runId,
    reason: outcome.reason ?? null
  }
  return next
}

export interface MissedRun {
  /** The slot that passed while nobody was there to run it. */
  missedAt: string
  /** Whether the schedule asked for that slot to be run once instead of skipped. */
  catchUp: boolean
}

/**
 * Decides, at launch, whether the stored next run was missed. At most one slot is ever reported:
 * the stored `nextRunAt`, however many slots have passed since. Disabled schedules, schedules with
 * no stored next run, and a clock that moved backwards (next run still ahead) report nothing.
 * A schedule that never ran is treated like any other: its first slot can be missed.
 */
export function findMissedRun(schedule: Schedule, now: Date): MissedRun | null {
  if (!schedule.enabled || !schedule.nextRunAt) return null
  const due = Date.parse(schedule.nextRunAt)
  if (Number.isNaN(due) || due > now.getTime()) return null
  return { missedAt: schedule.nextRunAt, catchUp: schedule.catchUp }
}
