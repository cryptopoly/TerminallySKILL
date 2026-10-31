import { describe, expect, it } from 'vitest'
import { getTourRect, placeTourCard } from './welcome-tour-layout'

const viewport = { width: 1024, height: 700 }
const card = { width: 360, height: 220 }

describe('welcome tour layout', () => {
  it('covers several boxes with one rectangle', () => {
    expect(
      getTourRect([
        { left: 10, top: 50, right: 60, bottom: 80 },
        { left: 70, top: 48, right: 120, bottom: 82 }
      ])
    ).toEqual({ left: 10, top: 48, width: 110, height: 34 })
  })

  it('centres the card when there is no target', () => {
    expect(placeTourCard(null, card, viewport)).toEqual({ left: 332, top: 240 })
  })

  it('puts the card below a target near the top and keeps it inside the window', () => {
    const position = placeTourCard({ left: 980, top: 8, width: 30, height: 24 }, card, viewport)
    expect(position.top).toBe(44)
    expect(position.left + card.width).toBeLessThanOrEqual(viewport.width - 16)
  })

  it('puts the card above a target near the bottom', () => {
    const position = placeTourCard({ left: 100, top: 640, width: 80, height: 30 }, card, viewport)
    expect(position.top).toBe(640 - 12 - card.height)
  })

  it('puts the card beside a tall target', () => {
    const position = placeTourCard({ left: 0, top: 20, width: 300, height: 660 }, card, viewport)
    expect(position.left).toBe(312)
  })

  it('falls back to the centre when nothing fits and never goes off screen', () => {
    const tiny = { width: 400, height: 300 }
    const position = placeTourCard({ left: 0, top: 0, width: 400, height: 300 }, card, tiny)
    expect(position.left).toBeGreaterThanOrEqual(16)
    expect(position.top).toBeGreaterThanOrEqual(16)
  })
})
