import type { Project } from '../../../shared/project-schema'

export interface ProjectTerminalInfo {
  count: number
  hasActive: boolean
}

/** Parse "Group / Name" convention. Returns group=null for ungrouped projects. */
export function parseProjectGroup(name: string): { group: string | null; displayName: string } {
  const idx = name.indexOf(' / ')
  if (idx === -1) return { group: null, displayName: name }
  return { group: name.slice(0, idx).trim(), displayName: name.slice(idx + 3).trim() }
}

/** Active processes first, then open terminals, then most recently opened. */
export function sortProjectsForPicker(
  projects: Project[],
  getInfo: (projectId: string) => ProjectTerminalInfo
): Project[] {
  return [...projects].sort((a, b) => {
    const aInfo = getInfo(a.id)
    const bInfo = getInfo(b.id)
    if (aInfo.hasActive !== bInfo.hasActive) return aInfo.hasActive ? -1 : 1
    if ((aInfo.count > 0) !== (bInfo.count > 0)) return aInfo.count > 0 ? -1 : 1
    return (b.lastOpenedAt ?? '').localeCompare(a.lastOpenedAt ?? '')
  })
}

/** Ungrouped projects first, then named groups sorted by name. */
export function groupProjectsForPicker(
  sorted: Project[],
  compareGroupNames: (a: string, b: string) => number
): Array<{ group: string | null; projects: Project[] }> {
  const map = new Map<string | null, Project[]>()
  for (const p of sorted) {
    const { group } = parseProjectGroup(p.name)
    if (!map.has(group)) map.set(group, [])
    map.get(group)!.push(p)
  }
  const result: Array<{ group: string | null; projects: Project[] }> = []
  const ungrouped = map.get(null)
  if (ungrouped?.length) result.push({ group: null, projects: ungrouped })
  const named = [...map.entries()]
    .filter((entry): entry is [string, Project[]] => entry[0] !== null)
    .sort(([a], [b]) => compareGroupNames(a, b))
  for (const [group, projects] of named) result.push({ group, projects })
  return result
}

/** The picker's order as one flat list (no search, every group expanded). */
export function orderProjectsForPicker(
  projects: Project[],
  getInfo: (projectId: string) => ProjectTerminalInfo,
  compareGroupNames: (a: string, b: string) => number
): Project[] {
  return groupProjectsForPicker(sortProjectsForPicker(projects, getInfo), compareGroupNames).flatMap(
    (g) => g.projects
  )
}

/**
 * Next/previous project in an ordered list, wrapping around. Returns null when there is nothing to
 * do (no projects, or the only project is already active). If the active project is not in the list,
 * goes to the first one.
 */
export function cycleProject(
  ordered: Project[],
  activeId: string | null | undefined,
  direction: 1 | -1
): Project | null {
  if (ordered.length === 0) return null
  const idx = activeId ? ordered.findIndex((p) => p.id === activeId) : -1
  if (idx === -1) return ordered[0]
  if (ordered.length === 1) return null
  return ordered[(idx + direction + ordered.length) % ordered.length]
}

/**
 * Which way a keydown cycles projects, or null if it is not the shortcut.
 * macOS: Cmd+Option+Down/Up. Windows/Linux: Ctrl+Alt+PageDown/PageUp.
 */
export function matchProjectCycleKey(
  e: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>,
  isMac: boolean
): 1 | -1 | null {
  if (!e.altKey || e.shiftKey) return null
  if (isMac) {
    if (!e.metaKey || e.ctrlKey) return null
    return e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : null
  }
  if (!e.ctrlKey || e.metaKey) return null
  return e.key === 'PageDown' ? 1 : e.key === 'PageUp' ? -1 : null
}

/** Shortcut text for display, matching how other shortcuts are shown (symbols on macOS). */
export function formatProjectCycleShortcut(isMac: boolean, direction: 1 | -1): string {
  if (isMac) return direction === 1 ? '⌘⌥↓' : '⌘⌥↑'
  return direction === 1 ? 'Ctrl+Alt+PageDown' : 'Ctrl+Alt+PageUp'
}
