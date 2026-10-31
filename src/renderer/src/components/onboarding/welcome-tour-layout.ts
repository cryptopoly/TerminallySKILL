export interface TourRect {
  left: number
  top: number
  width: number
  height: number
}

interface Size {
  width: number
  height: number
}

const MARGIN = 16
const GAP = 12

/** Smallest rectangle covering every given box (used to light several tabs at once). */
export function getTourRect(boxes: Array<{ left: number; top: number; right: number; bottom: number }>): TourRect {
  const left = Math.min(...boxes.map((box) => box.left))
  const top = Math.min(...boxes.map((box) => box.top))
  const right = Math.max(...boxes.map((box) => box.right))
  const bottom = Math.max(...boxes.map((box) => box.bottom))
  return { left, top, width: right - left, height: bottom - top }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, Math.max(min, max)))
}

/**
 * Where to put the tour card: below the target, else above, else beside it, else centred.
 * Always inside the window, so a small window (1024x700) never pushes the buttons off screen.
 */
export function placeTourCard(target: TourRect | null, card: Size, viewport: Size): { top: number; left: number } {
  const maxLeft = viewport.width - card.width - MARGIN
  const maxTop = viewport.height - card.height - MARGIN
  const centred = {
    left: clamp((viewport.width - card.width) / 2, MARGIN, maxLeft),
    top: clamp((viewport.height - card.height) / 2, MARGIN, maxTop)
  }
  if (!target) return centred

  const alignedLeft = clamp(target.left + target.width / 2 - card.width / 2, MARGIN, maxLeft)
  const below = target.top + target.height + GAP
  if (below + card.height <= viewport.height - MARGIN) return { top: below, left: alignedLeft }

  const above = target.top - GAP - card.height
  if (above >= MARGIN) return { top: above, left: alignedLeft }

  const alignedTop = clamp(target.top + target.height / 2 - card.height / 2, MARGIN, maxTop)
  const right = target.left + target.width + GAP
  if (right + card.width <= viewport.width - MARGIN) return { top: alignedTop, left: right }

  const left = target.left - GAP - card.width
  if (left >= MARGIN) return { top: alignedTop, left }

  return centred
}
