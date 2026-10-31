import { describe, expect, it } from 'vitest'
import {
  attentionKindForExit,
  normalizeAttentionMinSeconds,
  pickNextAttentionSession,
  resolveTabDotState,
  shouldRaiseCommandAttention
} from './attention'

const start = '2026-10-29T10:00:00.000Z'
const after = (seconds: number): string => new Date(Date.parse(start) + seconds * 1000).toISOString()

describe('shouldRaiseCommandAttention', () => {
  it('ignores commands shorter than the threshold', () => {
    expect(shouldRaiseCommandAttention({ startedAt: start, completedAt: after(14), minSeconds: 15, userIsWatching: false })).toBe(false)
  })

  it('raises for commands at or over the threshold', () => {
    expect(shouldRaiseCommandAttention({ startedAt: start, completedAt: after(15), minSeconds: 15, userIsWatching: false })).toBe(true)
  })

  it('never raises while the user is watching that terminal', () => {
    expect(shouldRaiseCommandAttention({ startedAt: start, completedAt: after(600), minSeconds: 15, userIsWatching: true })).toBe(false)
  })

  it('ignores unparseable timestamps', () => {
    expect(shouldRaiseCommandAttention({ startedAt: 'x', completedAt: after(60), minSeconds: 5, userIsWatching: false })).toBe(false)
  })
})

describe('attentionKindForExit', () => {
  it('maps exit codes', () => {
    expect(attentionKindForExit(0)).toBe('finished')
    expect(attentionKindForExit(null)).toBe('finished')
    expect(attentionKindForExit(2)).toBe('failed')
  })
})

describe('normalizeAttentionMinSeconds', () => {
  it('keeps listed values and falls back otherwise', () => {
    expect(normalizeAttentionMinSeconds(30)).toBe(30)
    expect(normalizeAttentionMinSeconds(7)).toBe(15)
    expect(normalizeAttentionMinSeconds('30')).toBe(15)
  })
})

describe('pickNextAttentionSession', () => {
  const entry = (seconds: number) => ({ kind: 'approval' as const, detail: 'x', at: after(seconds) })

  it('picks the terminal that has waited longest', () => {
    expect(pickNextAttentionSession({ b: entry(20), a: entry(5), c: entry(10) }, ['a', 'b', 'c'])).toBe('a')
  })

  it('skips closed terminals and returns null when nothing is waiting', () => {
    expect(pickNextAttentionSession({ gone: entry(1), b: entry(9) }, ['b'])).toBe('b')
    expect(pickNextAttentionSession({}, ['a'])).toBeNull()
  })
})

describe('resolveTabDotState', () => {
  const entry = (kind: 'finished' | 'failed' | 'approval') => ({ kind, detail: 'x', at: start })

  it('shows nothing for an idle terminal', () => {
    expect(resolveTabDotState({ entry: null, shellBusy: false, agentActivity: null })).toBeNull()
  })

  it('shows running while the shell is busy', () => {
    expect(resolveTabDotState({ entry: undefined, shellBusy: true, agentActivity: undefined })).toBe('running')
  })

  it('lets finished, failed and needs-you win over running', () => {
    for (const kind of ['finished', 'failed', 'approval'] as const) {
      expect(resolveTabDotState({ entry: entry(kind), shellBusy: true, agentActivity: 'working' })).toBe(kind)
    }
  })

  it('follows the state an agent reports over the shell', () => {
    expect(resolveTabDotState({ entry: null, shellBusy: true, agentActivity: 'idle' })).toBeNull()
    expect(resolveTabDotState({ entry: null, shellBusy: false, agentActivity: 'working' })).toBe('running')
  })
})
