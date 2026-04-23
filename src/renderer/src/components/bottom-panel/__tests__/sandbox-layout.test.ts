import { describe, expect, it } from 'vitest'
import {
  PLOT_LEFT_PADDING,
  chapterToTimelineX,
  dragExceededThreshold,
  getPlotNodeLeft,
  projectPlotDrag
} from '../sandbox-layout'

describe('sandbox-layout', () => {
  it('keeps the first chapter node visible with left padding', () => {
    expect(chapterToTimelineX(1)).toBe(PLOT_LEFT_PADDING)
    expect(getPlotNodeLeft(1)).toBeGreaterThan(0)
  })

  it('maps drag delta to chapter and score changes with clamp', () => {
    expect(projectPlotDrag(3, 1, 45, -40)).toEqual({ chapter: 6, score: 3 })
    expect(projectPlotDrag(1, 4, -999, -999)).toEqual({ chapter: 1, score: 5 })
    expect(projectPlotDrag(2, -4, 0, 999)).toEqual({ chapter: 2, score: -5 })
  })

  it('separates click from drag with a movement threshold', () => {
    expect(dragExceededThreshold(2, 3)).toBe(false)
    expect(dragExceededThreshold(7, 0)).toBe(true)
    expect(dragExceededThreshold(0, -8)).toBe(true)
  })
})
