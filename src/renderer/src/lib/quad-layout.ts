/** Quad split: four terminals of one project in a 2x2 grid. Pure helpers, so the rules are testable. */

export const QUAD_PANE_COUNT = 4

/** Smallest useful pane: about 36 columns and a few rows plus the footer and prompt. */
export const QUAD_MIN_PANE_WIDTH = 300
export const QUAD_MIN_PANE_HEIGHT = 150

/** Four slots, row by row: top left, top right, bottom left, bottom right. null = no terminal yet. */
export type QuadSlots = (string | null)[]

/** How the four panes are laid out in the space there is. */
export type QuadArrangement = 'grid' | 'row' | 'column' | 'single'

/** Sessions with no project share one key. */
export function quadKey(projectId: string | null): string {
  return projectId ?? ''
}

/**
 * The panes on entering quad: the tab in use first, then the split's other pane, then the other open
 * tabs in tab order. Missing panes stay null until new terminals open for them.
 */
export function buildQuadSlots(
  projectSessionIds: string[],
  activeSessionId: string | null,
  splitSessionId: string | null
): QuadSlots {
  const ordered: string[] = []
  for (const id of [activeSessionId, splitSessionId, ...projectSessionIds]) {
    if (id && projectSessionIds.includes(id) && !ordered.includes(id)) ordered.push(id)
  }
  return Array.from({ length: QUAD_PANE_COUNT }, (_, index) => ordered[index] ?? null)
}

/** Puts a session in one slot. If it was in another slot already, the two swap places. */
export function placeInQuadSlot(slots: QuadSlots, index: number, sessionId: string): QuadSlots {
  if (index < 0 || index >= slots.length) return slots
  const next = [...slots]
  const previousIndex = next.indexOf(sessionId)
  if (previousIndex === index) return slots
  if (previousIndex >= 0) next[previousIndex] = next[index]
  next[index] = sessionId
  return next
}

/** The next (1) or previous (-1) pane with a terminal in it, in reading order, wrapping round. */
export function nextQuadSessionId(slots: QuadSlots, currentId: string | null, direction: 1 | -1): string | null {
  const filled = slots.filter((id): id is string => Boolean(id))
  if (filled.length === 0) return null
  const index = currentId ? filled.indexOf(currentId) : -1
  if (index < 0) return filled[0]
  return filled[(index + direction + filled.length) % filled.length]
}

/**
 * A 2x2 grid when each pane gets its minimum size, else four side by side or four stacked when one
 * of those fits, else only the focused pane (quad stays on and comes back when the space grows).
 */
export function resolveQuadArrangement(
  width: number,
  height: number,
  minWidth = QUAD_MIN_PANE_WIDTH,
  minHeight = QUAD_MIN_PANE_HEIGHT
): QuadArrangement {
  if (width >= 2 * minWidth && height >= 2 * minHeight) return 'grid'
  if (width >= 4 * minWidth && height >= minHeight) return 'row'
  if (height >= 4 * minHeight && width >= minWidth) return 'column'
  return 'single'
}

/** Keeps a divider (percent) where both panes beside it keep their minimum size, and within 20-80%. */
export function clampQuadRatio(ratio: number, size: number, minPane: number): number {
  const minPercent = size > 0 ? Math.min(50, (minPane / size) * 100) : 20
  const low = Math.max(20, minPercent)
  const high = Math.min(80, 100 - minPercent)
  return Math.max(low, Math.min(high, ratio))
}
