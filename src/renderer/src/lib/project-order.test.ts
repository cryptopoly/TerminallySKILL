import { describe, expect, it } from 'vitest'
import type { Project } from '../../../shared/project-schema'
import {
  cycleProject,
  matchProjectCycleKey,
  orderProjectsForPicker,
  parseProjectGroup,
  sortProjectsForPicker
} from './project-order'

const p = (id: string, name = id, lastOpenedAt = ''): Project => ({ id, name, lastOpenedAt }) as Project
const none = (): { count: number; hasActive: boolean } => ({ count: 0, hasActive: false })
const cmp = (a: string, b: string): number => a.localeCompare(b)

describe('cycleProject', () => {
  const list = [p('a'), p('b'), p('c')]
  it('goes next and previous', () => {
    expect(cycleProject(list, 'a', 1)?.id).toBe('b')
    expect(cycleProject(list, 'c', -1)?.id).toBe('b')
  })
  it('wraps around', () => {
    expect(cycleProject(list, 'c', 1)?.id).toBe('a')
    expect(cycleProject(list, 'a', -1)?.id).toBe('c')
  })
  it('is a no-op for a single project', () => {
    expect(cycleProject([p('a')], 'a', 1)).toBeNull()
  })
  it('is a no-op for zero projects', () => {
    expect(cycleProject([], 'a', 1)).toBeNull()
    expect(cycleProject([], null, -1)).toBeNull()
  })
  it('goes to the first project when the active one is missing', () => {
    expect(cycleProject(list, 'zzz', 1)?.id).toBe('a')
    expect(cycleProject(list, null, -1)?.id).toBe('a')
    expect(cycleProject([p('a')], 'zzz', 1)?.id).toBe('a')
  })
})

describe('picker order', () => {
  it('parses groups', () => {
    expect(parseProjectGroup('Work / API')).toEqual({ group: 'Work', displayName: 'API' })
    expect(parseProjectGroup('Solo')).toEqual({ group: null, displayName: 'Solo' })
  })
  it('sorts by activity, open terminals, then recency', () => {
    const info = (id: string): { count: number; hasActive: boolean } =>
      id === 'busy' ? { count: 1, hasActive: true } : id === 'open' ? { count: 2, hasActive: false } : none()
    const out = sortProjectsForPicker(
      [p('old', 'old', '1'), p('open'), p('new', 'new', '2'), p('busy')],
      info
    )
    expect(out.map((x) => x.id)).toEqual(['busy', 'open', 'new', 'old'])
  })
  it('puts ungrouped first then groups by name', () => {
    const out = orderProjectsForPicker(
      [p('1', 'Zed / one', '9'), p('2', 'Solo', '1'), p('3', 'Alpha / two', '5')],
      none,
      cmp
    )
    expect(out.map((x) => x.id)).toEqual(['2', '3', '1'])
  })
})

describe('matchProjectCycleKey', () => {
  const k = (
    key: string,
    mods: Partial<Record<'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey', boolean>>
  ): Parameters<typeof matchProjectCycleKey>[0] => ({
    key,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    ...mods
  })
  it('matches Cmd+Option+Down/Up on macOS only', () => {
    expect(matchProjectCycleKey(k('ArrowDown', { metaKey: true, altKey: true }), true)).toBe(1)
    expect(matchProjectCycleKey(k('ArrowUp', { metaKey: true, altKey: true }), true)).toBe(-1)
    expect(matchProjectCycleKey(k('ArrowDown', { metaKey: true }), true)).toBeNull()
    expect(matchProjectCycleKey(k('ArrowDown', { altKey: true }), true)).toBeNull()
    expect(matchProjectCycleKey(k('PageDown', { ctrlKey: true, altKey: true }), true)).toBeNull()
  })
  it('matches Ctrl+Alt+PageDown/PageUp elsewhere', () => {
    expect(matchProjectCycleKey(k('PageDown', { ctrlKey: true, altKey: true }), false)).toBe(1)
    expect(matchProjectCycleKey(k('PageUp', { ctrlKey: true, altKey: true }), false)).toBe(-1)
    expect(matchProjectCycleKey(k('PageDown', { ctrlKey: true }), false)).toBeNull()
    expect(matchProjectCycleKey(k('ArrowDown', { ctrlKey: true, altKey: true }), false)).toBeNull()
  })
})
