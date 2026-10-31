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

/** The terminal that has waited longest for the user, among those still open. */
export function pickNextAttentionSession(
  entries: Record<string, AttentionEntry>,
  openSessionIds: Iterable<string>
): string | null {
  const open = new Set(openSessionIds)
  let next: { sessionId: string; at: string } | null = null
  for (const [sessionId, entry] of Object.entries(entries)) {
    if (!open.has(sessionId)) continue
    if (!next || entry.at < next.at) next = { sessionId, at: entry.at }
  }
  return next?.sessionId ?? null
}

export function attentionKindForExit(exitCode: number | null): AttentionKind {
  return exitCode !== null && exitCode !== 0 ? 'failed' : 'finished'
}

/** What a program reported about itself through OSC 7501: busy, or open but not working. */
export type AgentActivity = 'working' | 'idle'

/** The tab dot: one of the attention kinds, or `running` while a command or agent is busy. */
export type TabDotState = AttentionKind | 'running'

/**
 * Finished, failed and needs-you entries always win, since they wait for the user. Otherwise the
 * dot shows `running` while the terminal is busy. An agent that reports its own state overrides
 * the shell, so an open but quiet agent does not look busy.
 */
export function resolveTabDotState(params: {
  entry: AttentionEntry | null | undefined
  shellBusy: boolean
  agentActivity: AgentActivity | null | undefined
}): TabDotState | null {
  if (params.entry) return params.entry.kind
  if (params.agentActivity) return params.agentActivity === 'working' ? 'running' : null
  return params.shellBusy ? 'running' : null
}
