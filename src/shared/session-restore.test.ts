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
