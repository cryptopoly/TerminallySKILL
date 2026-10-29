import { describe, expect, it } from 'vitest'
import {
  attentionKindForExit,
  normalizeAttentionMinSeconds,
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
