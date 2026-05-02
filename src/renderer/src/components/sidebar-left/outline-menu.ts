export interface MenuPoint {
  x: number
  y: number
}

export interface MenuViewport {
  width: number
  height: number
}

export function normalizeOutlineTitle(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function clampOutlineMenuPosition(
  point: MenuPoint,
  viewport: MenuViewport,
  menuSize: { width: number; height: number } = { width: 176, height: 220 },
  margin = 8
): MenuPoint {
  const maxX = Math.max(margin, viewport.width - menuSize.width - margin)
  const maxY = Math.max(margin, viewport.height - menuSize.height - margin)
  return {
    x: Math.min(Math.max(point.x, margin), maxX),
    y: Math.min(Math.max(point.y, margin), maxY)
  }
}

export function getVolumeDeleteMessage(chapterCount: number): string {
  if (chapterCount <= 0) return '将删除该卷，确定删除？'
  return `将同时删除该卷下 ${chapterCount} 个章节及关联数据，确定删除？`
}
