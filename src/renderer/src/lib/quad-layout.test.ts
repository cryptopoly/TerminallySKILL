import { describe, expect, it } from 'vitest'
import {
  buildQuadSlots,
  clampQuadRatio,
  nextQuadSessionId,
  placeInQuadSlot,
  quadKey,
  resolveQuadArrangement
} from './quad-layout'

describe('quad layout', () => {
  it('starts with the tab in use, then the split pane, then the other tabs in order', () => {
    expect(buildQuadSlots(['a', 'b', 'c', 'd', 'e'], 'c', 'e')).toEqual(['c', 'e', 'a', 'b'])
    expect(buildQuadSlots(['a', 'b'], 'b', null)).toEqual(['b', 'a', null, null])
    expect(buildQuadSlots([], null, null)).toEqual([null, null, null, null])
    // Sessions of other projects never end up in the grid
    expect(buildQuadSlots(['a'], 'other', 'x')).toEqual(['a', null, null, null])
  })

  it('places a session in a pane, swapping when it already sits in another', () => {
    expect(placeInQuadSlot(['a', 'b', 'c', 'd'], 1, 'e')).toEqual(['a', 'e', 'c', 'd'])
    expect(placeInQuadSlot(['a', 'b', 'c', 'd'], 0, 'd')).toEqual(['d', 'b', 'c', 'a'])
    expect(placeInQuadSlot(['a', null, null, null], 2, 'a')).toEqual([null, null, 'a', null])
    const same = ['a', 'b', null, null]
    expect(placeInQuadSlot(same, 0, 'a')).toBe(same)
    expect(placeInQuadSlot(same, 9, 'x')).toBe(same)
  })

  it('moves focus through the panes in reading order and skips empty ones', () => {
    const slots = ['a', 'b', null, 'd']
    expect(nextQuadSessionId(slots, 'a', 1)).toBe('b')
    expect(nextQuadSessionId(slots, 'b', 1)).toBe('d')
    expect(nextQuadSessionId(slots, 'd', 1)).toBe('a')
    expect(nextQuadSessionId(slots, 'a', -1)).toBe('d')
    expect(nextQuadSessionId(slots, 'elsewhere', 1)).toBe('a')
    expect(nextQuadSessionId([null, null, null, null], 'a', 1)).toBeNull()
  })

  it('uses a 2x2 grid when it fits and falls back rather than squashing panes', () => {
    expect(resolveQuadArrangement(1400, 800)).toBe('grid')
    expect(resolveQuadArrangement(600, 300)).toBe('grid')
    // A short docked terminal on a wide window: four side by side
    expect(resolveQuadArrangement(1400, 220)).toBe('row')
    // Tall and narrow: four stacked
    expect(resolveQuadArrangement(400, 700)).toBe('column')
    // Too small for any: only the focused pane
    expect(resolveQuadArrangement(500, 200)).toBe('single')
  })

  it('keeps dividers where both neighbours keep their minimum size', () => {
    expect(clampQuadRatio(50, 1000, 300)).toBe(50)
    expect(clampQuadRatio(10, 1000, 300)).toBe(30)
    expect(clampQuadRatio(95, 1000, 300)).toBe(70)
    expect(clampQuadRatio(10, 3000, 300)).toBe(20)
    expect(clampQuadRatio(35, 500, 300)).toBe(50)
  })

  it('gives sessions without a project their own key', () => {
    expect(quadKey(null)).toBe('')
    expect(quadKey('p1')).toBe('p1')
  })
})
