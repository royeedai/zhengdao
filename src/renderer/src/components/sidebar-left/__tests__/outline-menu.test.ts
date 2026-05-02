import { describe, expect, it } from 'vitest'
import { clampOutlineMenuPosition, getVolumeDeleteMessage, normalizeOutlineTitle } from '../outline-menu'

describe('outline menu helpers', () => {
  it('normalizes blank and padded titles before rename writes', () => {
    expect(normalizeOutlineTitle('  第一章  ')).toBe('第一章')
    expect(normalizeOutlineTitle('   ')).toBeNull()
  })

  it('keeps context menus inside the visible viewport', () => {
    expect(clampOutlineMenuPosition({ x: 990, y: 790 }, { width: 1000, height: 800 })).toEqual({
      x: 816,
      y: 572
    })
    expect(clampOutlineMenuPosition({ x: -20, y: -10 }, { width: 1000, height: 800 })).toEqual({
      x: 8,
      y: 8
    })
  })

  it('states whether deleting a volume will also delete chapters', () => {
    expect(getVolumeDeleteMessage(0)).toBe('将删除该卷，确定删除？')
    expect(getVolumeDeleteMessage(3)).toBe('将同时删除该卷下 3 个章节及关联数据，确定删除？')
  })
})
