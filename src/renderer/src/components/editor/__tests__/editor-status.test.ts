import { describe, expect, it } from 'vitest'
import { buildChapterSaveStatusDisplay, getAiChapterDraftWordLabel, getWordCountLabel } from '../editor-status'

describe('editor status display', () => {
  it('prioritizes transient save states over the previous saved timestamp', () => {
    expect(
      buildChapterSaveStatusDisplay({ kind: 'saving', chapterId: 7, savedAt: null, error: null }, '21:40')
    ).toMatchObject({
      label: '正文保存中',
      className: 'text-[var(--warning-primary)]'
    })
    expect(
      buildChapterSaveStatusDisplay({ kind: 'dirty', chapterId: 7, savedAt: null, error: null }, '21:40')
    ).toMatchObject({
      label: '正文未保存',
      className: 'text-[var(--warning-primary)]'
    })
  })

  it('surfaces save errors as the dangerous editor state', () => {
    expect(
      buildChapterSaveStatusDisplay({ kind: 'error', chapterId: 7, savedAt: null, error: '磁盘写入失败' }, '')
    ).toMatchObject({
      label: '正文保存失败',
      title: '磁盘写入失败',
      className: 'text-[var(--danger-primary)]'
    })
  })

  it('formats editor word labels consistently', () => {
    expect(getWordCountLabel(1234.4)).toBe('1,234 字')
    expect(getWordCountLabel(-9)).toBe('0 字')
    expect(getAiChapterDraftWordLabel(2048)).toBe('AI 草稿 2,048 字')
  })
})
