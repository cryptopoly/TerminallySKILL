import { describe, expect, it } from 'vitest'
import { QUIET_AFTER_MS, resolveQuietMs, shouldCheckQuietTerminal, shouldRaiseForBell } from './quiet-terminal'

const base = {
  shellBusy: true,
  agentActivity: null,
  watched: false,
  hasEntry: false,
  alreadyQuiet: false,
  lastOutputAt: 0,
  now: QUIET_AFTER_MS
}

describe('shouldCheckQuietTerminal', () => {
  it('fires for a busy, unwatched terminal silent for 20 seconds', () => {
    expect(shouldCheckQuietTerminal(base)).toBe(true)
    expect(shouldCheckQuietTerminal({ ...base, now: QUIET_AFTER_MS - 1 })).toBe(false)
  })

  it('also fires for an agent that reported idle without shell integration', () => {
    expect(shouldCheckQuietTerminal({ ...base, shellBusy: false, agentActivity: 'idle' })).toBe(true)
  })

  it('stays quiet for a prompt, a watched tab, an existing dot, a repeat, or a working agent', () => {
    expect(shouldCheckQuietTerminal({ ...base, shellBusy: false })).toBe(false)
    expect(shouldCheckQuietTerminal({ ...base, watched: true })).toBe(false)
    expect(shouldCheckQuietTerminal({ ...base, hasEntry: true })).toBe(false)
    expect(shouldCheckQuietTerminal({ ...base, alreadyQuiet: true })).toBe(false)
    expect(shouldCheckQuietTerminal({ ...base, agentActivity: 'working' })).toBe(false)
  })

  it('honours a shorter test wait', () => {
    expect(shouldCheckQuietTerminal({ ...base, now: 1500, quietMs: 1500 })).toBe(true)
  })
})

describe('shouldRaiseForBell', () => {
  it('counts the bell only from a busy terminal nobody is looking at', () => {
    expect(shouldRaiseForBell({ shellBusy: true, agentActivity: null, watched: false })).toBe(true)
    expect(shouldRaiseForBell({ shellBusy: false, agentActivity: 'idle', watched: false })).toBe(true)
    expect(shouldRaiseForBell({ shellBusy: false, agentActivity: null, watched: false })).toBe(false)
    expect(shouldRaiseForBell({ shellBusy: true, agentActivity: 'working', watched: true })).toBe(false)
  })
})

describe('resolveQuietMs', () => {
  it('uses the default unless given a sane shorter value', () => {
    expect(resolveQuietMs(undefined)).toBe(QUIET_AFTER_MS)
    expect(resolveQuietMs('abc')).toBe(QUIET_AFTER_MS)
    expect(resolveQuietMs('1500')).toBe(1500)
    expect(resolveQuietMs(10)).toBe(500)
    expect(resolveQuietMs(999_999)).toBe(QUIET_AFTER_MS)
  })
})
