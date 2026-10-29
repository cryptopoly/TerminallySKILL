export type AttentionKind = 'finished' | 'failed' | 'approval'

export interface AttentionEntry {
  kind: AttentionKind
  /** Short text shown in the notification body and the tab tooltip */
  detail: string
  at: string
}

export interface AttentionNotifyRequest {
  sessionId: string
  title: string
  body: string
}

export const ATTENTION_MIN_SECONDS_OPTIONS = [5, 15, 30, 60, 300] as const
export const DEFAULT_ATTENTION_MIN_SECONDS = 15

export function normalizeAttentionMinSeconds(value: unknown): number {
  return typeof value === 'number' && (ATTENTION_MIN_SECONDS_OPTIONS as readonly number[]).includes(value)
    ? value
    : DEFAULT_ATTENTION_MIN_SECONDS
}

/**
 * A finished command raises attention only when it ran long enough that the user probably
 * looked away, and only when they are not already looking at that terminal.
 */
export function shouldRaiseCommandAttention(params: {
  startedAt: string
  completedAt: string
  minSeconds: number
  userIsWatching: boolean
}): boolean {
  if (params.userIsWatching) return false
  const started = Date.parse(params.startedAt)
  const completed = Date.parse(params.completedAt)
  if (!Number.isFinite(started) || !Number.isFinite(completed)) return false
  return completed - started >= params.minSeconds * 1000
}

export function attentionKindForExit(exitCode: number | null): AttentionKind {
  return exitCode !== null && exitCode !== 0 ? 'failed' : 'finished'
}
