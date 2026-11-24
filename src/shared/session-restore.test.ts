import { describe, expect, it } from 'vitest'
import { buildSavedTerminalLayout, MAX_SAVED_TERMINAL_TABS, parseSavedTerminalLayout } from './session-restore'

const cwds: Record<string, string> = { a: '/work/a', b: '/work/b', c: '/other' }

describe('buildSavedTerminalLayout', () => {
  it('keeps tab order, folders, the active tab and the split', () => {
    const layout = buildSavedTerminalLayout(
      [{
        tabs: [{ sessionId: 'a', projectId: 'p1' }, { sessionId: 'b', projectId: 'p1' }, { sessionId: 'x', projectId: null }],
        activeSessionId: 'b',
        splitSessionId: 'a',
        splitDirection: 'horizontal'
      }],
      (id) => cwds[id] ?? null
    )
    expect(layout).toEqual({
      version: 1,
      tabs: [{ projectId: 'p1', cwd: '/work/a' }, { projectId: 'p1', cwd: '/work/b' }, { projectId: null, cwd: null }],
      activeIndex: 1,
      split: { index: 0, direction: 'horizontal' }
    })
  })

  it('adds later windows after the first, without their active tab or split', () => {
    const layout = buildSavedTerminalLayout(
      [
        { tabs: [{ sessionId: 'a', projectId: null }], activeSessionId: 'a', splitSessionId: null, splitDirection: 'vertical' },
        { tabs: [{ sessionId: 'c', projectId: null }], activeSessionId: 'c', splitSessionId: 'c', splitDirection: 'vertical' }
      ],
      (id) => cwds[id] ?? null
    )
    expect(layout?.tabs.map((tab) => tab.cwd)).toEqual(['/work/a', '/other'])
    expect(layout?.activeIndex).toBe(0)
    expect(layout?.split).toBeNull()
  })

  it('saves nothing when there are no tabs, and caps the tab count', () => {
    expect(buildSavedTerminalLayout([], () => null)).toBeNull()
    const many = Array.from({ length: MAX_SAVED_TERMINAL_TABS + 5 }, (_, i) => ({ sessionId: `s${i}`, projectId: null }))
    const layout = buildSavedTerminalLayout(
      [{ tabs: many, activeSessionId: null, splitSessionId: null, splitDirection: 'vertical' }],
      () => null
    )
    expect(layout?.tabs).toHaveLength(MAX_SAVED_TERMINAL_TABS)
  })
})

describe('parseSavedTerminalLayout', () => {
  it('reads a saved layout back', () => {
    const saved = { version: 1, tabs: [{ projectId: 'p', cwd: '/a' }, { projectId: null, cwd: null }], activeIndex: 0, split: { index: 1, direction: 'vertical' } }
    expect(parseSavedTerminalLayout(saved)).toEqual(saved)
  })

  it('drops malformed parts', () => {
    expect(parseSavedTerminalLayout(null)).toBeNull()
    expect(parseSavedTerminalLayout({ version: 2, tabs: [{}] })).toBeNull()
    expect(parseSavedTerminalLayout({ version: 1, tabs: [] })).toBeNull()
    expect(parseSavedTerminalLayout({ version: 1, tabs: [{ projectId: 5, cwd: '  ' }], activeIndex: 3, split: { index: 0, direction: 'up' } }))
      .toEqual({ version: 1, tabs: [{ projectId: null, cwd: null }], activeIndex: null, split: null })
    // A split onto the active tab itself is not a split
    expect(parseSavedTerminalLayout({ version: 1, tabs: [{}, {}], activeIndex: 0, split: { index: 0, direction: 'vertical' } })?.split).toBeNull()
  })
})

describe('quad splits in the saved layout', () => {
  it("saves the first window's quads as tab indexes, row by row", () => {
    const layout = buildSavedTerminalLayout(
      [
        {
          tabs: ['a', 'b', 'c', 'd', 'e'].map((sessionId) => ({ sessionId, projectId: 'p1' })),
          activeSessionId: 'c',
          splitSessionId: null,
          splitDirection: 'vertical',
          quads: [['c', 'a', null, 'd'], ['gone', null]]
        },
        {
          tabs: [{ sessionId: 'x', projectId: null }],
          activeSessionId: 'x',
          splitSessionId: null,
          splitDirection: 'vertical',
          quads: [['x', null, null, null]]
        }
      ],
      () => null
    )
    expect(layout?.quads).toEqual([[2, 0, null, 3]])
    expect(layout?.activeIndex).toBe(2)
  })

  it('leaves the field out when there is no quad, so older builds read the same file', () => {
    const layout = buildSavedTerminalLayout(
      [{ tabs: [{ sessionId: 'a', projectId: null }], activeSessionId: 'a', splitSessionId: null, splitDirection: 'vertical', quads: [] }],
      () => null
    )
    expect(layout).not.toHaveProperty('quads')
  })

  it('reads quads back and drops bad panes', () => {
    const tabs = [{}, {}, {}, {}]
    expect(parseSavedTerminalLayout({ version: 1, tabs, activeIndex: 0, split: null, quads: [[0, 1, 2, 3]] })?.quads)
      .toEqual([[0, 1, 2, 3]])
    // Out of range, repeated and non-number panes become empty; a quad with no panes left is dropped
    expect(parseSavedTerminalLayout({ version: 1, tabs, activeIndex: 0, split: null, quads: [[0, 0, 9, 'x'], [null], 'bad'] })?.quads)
      .toEqual([[0, null, null, null]])
    expect(parseSavedTerminalLayout({ version: 1, tabs, activeIndex: 0, split: null, quads: [[7]] })).not.toHaveProperty('quads')
  })

  it('still reads a layout saved before quads existed', () => {
    const old = { version: 1, tabs: [{ projectId: 'p', cwd: '/a' }], activeIndex: 0, split: null }
    expect(parseSavedTerminalLayout(old)).toEqual(old)
  })
})
