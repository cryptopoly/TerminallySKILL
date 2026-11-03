/**
 * The quiet-terminal check: a terminal that is running something (an agent, any command) and has
 * printed nothing for a while, while nobody looks at it, is probably waiting for the user.
 * Agent-neutral: it works for any program, with no tool-specific gate.
 */
import type { AgentActivity } from './attention'

/** Silence that counts as "waiting" (not a setting). */
export const QUIET_AFTER_MS = 20_000
/** How often each terminal is checked. */
export const QUIET_CHECK_INTERVAL_MS = 1_000

export function shouldCheckQuietTerminal(params: {
  /** Shell integration says a command is running */
  shellBusy: boolean
  /** What the program last reported through OSC 7501, if anything */
  agentActivity: AgentActivity | null | undefined
  /** The user is looking at this terminal right now */
  watched: boolean
  /** The tab already shows an attention dot (needs you, finished, failed) */
  hasEntry: boolean
  /** Already flagged quiet since the last output */
  alreadyQuiet: boolean
  lastOutputAt: number
  now: number
  quietMs?: number
}): boolean {
  if (!params.shellBusy && !params.agentActivity) return false
  // A program that says it is working is trusted: some think for a long time without printing.
  if (params.agentActivity === 'working') return false
  if (params.watched || params.hasEntry || params.alreadyQuiet) return false
  return params.now - params.lastOutputAt >= (params.quietMs ?? QUIET_AFTER_MS)
}

/**
 * The bell is rung for trivial reasons too (tab completion with no match, a wrong key in a pager),
 * so it only counts while something is running in a terminal nobody is looking at: that is when
 * an agent rings it to say it needs you.
 */
export function shouldRaiseForBell(params: {
  shellBusy: boolean
  agentActivity: AgentActivity | null | undefined
  watched: boolean
}): boolean {
  if (params.watched) return false
  return params.shellBusy || Boolean(params.agentActivity)
}

/** Test builds may shorten the wait (TSK_E2E_ATTENTION_QUIET_MS); anything odd falls back to the default. */
export function resolveQuietMs(override: unknown): number {
  const value = typeof override === 'string' ? Number(override) : override
  if (typeof value !== 'number' || !Number.isFinite(value)) return QUIET_AFTER_MS
  return Math.min(QUIET_AFTER_MS, Math.max(500, Math.round(value)))
}
