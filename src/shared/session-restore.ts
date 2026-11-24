/** Terminal tabs reopened at the next launch (opt-in). Only local shells: no SSH or VNC reconnects, no scrollback. */

export type SavedSplitDirection = 'horizontal' | 'vertical'

/** What a window reports whenever its tabs change */
export interface ReportedTerminalLayout {
  tabs: { sessionId: string; projectId: string | null }[]
  activeSessionId: string | null
  splitSessionId: string | null
  splitDirection: SavedSplitDirection
}

export interface SavedTerminalTab {
  projectId: string | null
  cwd: string | null
}

export interface SavedTerminalLayout {
  version: 1
  tabs: SavedTerminalTab[]
  activeIndex: number | null
  split: { index: number; direction: SavedSplitDirection } | null
}

export const MAX_SAVED_TERMINAL_TABS = 20

/** Joins the windows' reported tabs (first window first) and adds each tab's last known folder. */
export function buildSavedTerminalLayout(
  layouts: ReportedTerminalLayout[],
  getCwd: (sessionId: string) => string | null
): SavedTerminalLayout | null {
  const tabs: SavedTerminalTab[] = []
  let activeIndex: number | null = null
  let split: SavedTerminalLayout['split'] = null
  layouts.forEach((layout, windowIndex) => {
    for (const tab of layout.tabs) {
      if (tabs.length >= MAX_SAVED_TERMINAL_TABS) return
      // Active tab and split come from the first window only; it is the one that reopens them.
      if (windowIndex === 0 && tab.sessionId === layout.activeSessionId) activeIndex = tabs.length
      if (windowIndex === 0 && tab.sessionId === layout.splitSessionId) {
        split = { index: tabs.length, direction: layout.splitDirection }
      }
      tabs.push({ projectId: tab.projectId, cwd: getCwd(tab.sessionId) })
    }
  })
  if (tabs.length === 0) return null
  return { version: 1, tabs, activeIndex, split: split && activeIndex !== null ? split : null }
}

/** Reads a saved layout back, dropping anything malformed. */
export function parseSavedTerminalLayout(value: unknown): SavedTerminalLayout | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (raw.version !== 1 || !Array.isArray(raw.tabs)) return null
  const tabs = raw.tabs
    .filter((tab): tab is Record<string, unknown> => Boolean(tab) && typeof tab === 'object')
    .slice(0, MAX_SAVED_TERMINAL_TABS)
    .map((tab) => ({
      projectId: typeof tab.projectId === 'string' ? tab.projectId : null,
      cwd: typeof tab.cwd === 'string' && tab.cwd.trim() ? tab.cwd : null
    }))
  if (tabs.length === 0) return null
  const validIndex = (index: unknown): index is number =>
    typeof index === 'number' && Number.isInteger(index) && index >= 0 && index < tabs.length
  const activeIndex = validIndex(raw.activeIndex) ? raw.activeIndex : null
  const rawSplit = raw.split as Record<string, unknown> | null | undefined
  const split =
    activeIndex !== null &&
    rawSplit &&
    validIndex(rawSplit.index) &&
    rawSplit.index !== activeIndex &&
    (rawSplit.direction === 'horizontal' || rawSplit.direction === 'vertical')
      ? { index: rawSplit.index, direction: rawSplit.direction as SavedSplitDirection }
      : null
  return { version: 1, tabs, activeIndex, split }
}
