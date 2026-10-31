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

/** With no keyboard or mouse input for this long, a terminal in front of nobody counts as unwatched. */
export const AWAY_AFTER_SECONDS = 120

export function isUserAway(idleSeconds: number): boolean {
  return idleSeconds >= AWAY_AFTER_SECONDS
}

/** SIGHUP, SIGINT (Ctrl+C) and SIGTERM: the user or the system ended it on purpose. Not news. */
export function isUserStopExitCode(exitCode: number | null): boolean {
  return exitCode === 129 || exitCode === 130 || exitCode === 143
}

export function attentionKindForExit(exitCode: number | null): AttentionKind {
  return exitCode !== null && exitCode !== 0 ? 'failed' : 'finished'
}

/** What a program reported about itself through OSC 7501: busy, or open but not working. */
export type AgentActivity = 'working' | 'idle'

/**
 * The tab dot: one of the attention kinds, `running` while a command or agent is busy, or `idle`
 * while a program is open but quiet (it said so through OSC 7501, or printed nothing for a while).
 */
export type TabDotState = AttentionKind | 'running' | 'idle'

/**
 * Finished, failed and needs-you entries always win, since they wait for the user. An agent that
 * reports its own state overrides the shell, so an open but quiet agent shows idle, not running.
 * Otherwise a busy terminal that went quiet shows idle, and a busy one shows running.
 */
export function resolveTabDotState(params: {
  entry: AttentionEntry | null | undefined
  shellBusy: boolean
  agentActivity: AgentActivity | null | undefined
  quiet?: boolean
}): TabDotState | null {
  if (params.entry) return params.entry.kind
  if (params.agentActivity) return params.agentActivity === 'working' ? 'running' : 'idle'
  if (!params.shellBusy) return null
  return params.quiet ? 'idle' : 'running'
}
