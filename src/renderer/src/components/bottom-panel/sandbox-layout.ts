export const PLOT_CHAPTER_PX = 15
export const PLOT_SCORE_PX = 20
export const PLOT_LEFT_PADDING = 96
export const PLOT_RIGHT_PADDING = 160
export const PLOT_BASELINE_Y = 132
export const PLOT_CARD_WIDTH = 144
export const PLOT_DRAG_THRESHOLD = 6

export function clampPlotChapter(chapter: number): number {
  return Math.max(1, Math.round(chapter))
}

export function clampPlotScore(score: number): number {
  return Math.max(-5, Math.min(5, Math.round(score)))
}

export function chapterToTimelineX(chapter: number): number {
  return PLOT_LEFT_PADDING + (clampPlotChapter(chapter) - 1) * PLOT_CHAPTER_PX
}

export function scoreToTimelineY(score: number): number {
  return PLOT_BASELINE_Y - clampPlotScore(score) * PLOT_SCORE_PX
}

export function getTimelineWidth(maxChapter: number): number {
  const lastChapter = Math.max(20, clampPlotChapter(maxChapter))
  return chapterToTimelineX(lastChapter) + PLOT_RIGHT_PADDING
}

export function getPlotNodeLeft(chapter: number): number {
  return chapterToTimelineX(chapter) - PLOT_CARD_WIDTH / 2
}

export function dragExceededThreshold(deltaX: number, deltaY: number): boolean {
  return Math.abs(deltaX) > PLOT_DRAG_THRESHOLD || Math.abs(deltaY) > PLOT_DRAG_THRESHOLD
}

export function projectPlotDrag(startChapter: number, startScore: number, deltaX: number, deltaY: number) {
  return {
    chapter: clampPlotChapter(startChapter + deltaX / PLOT_CHAPTER_PX),
    score: clampPlotScore(startScore - deltaY / PLOT_SCORE_PX)
  }
}
