import type { ChapterSaveStatus } from '@/utils/daily-workbench'

export interface ChapterSaveStatusDisplay {
  label: string
  title: string
  className: string
}

const SAVE_STATUS_CLASS = {
  muted: 'text-[var(--text-muted)]',
  warning: 'text-[var(--warning-primary)]',
  danger: 'text-[var(--danger-primary)]'
} as const

export function buildChapterSaveStatusDisplay(
  status: ChapterSaveStatus,
  savedAtLabel: string
): ChapterSaveStatusDisplay {
  if (status.kind === 'saving') {
    return {
      label: '正文保存中',
      title: '正在写入本地数据库',
      className: SAVE_STATUS_CLASS.warning
    }
  }
  if (status.kind === 'dirty') {
    return {
      label: '正文未保存',
      title: '自动保存已排队',
      className: SAVE_STATUS_CLASS.warning
    }
  }
  if (status.kind === 'error') {
    return {
      label: '正文保存失败',
      title: status.error || '请手动重试保存',
      className: SAVE_STATUS_CLASS.danger
    }
  }
  if (savedAtLabel) {
    return {
      label: `正文已保存 ${savedAtLabel}`,
      title: `最近保存 ${savedAtLabel}`,
      className: SAVE_STATUS_CLASS.muted
    }
  }
  return {
    label: '正文已保存',
    title: '当前正文已写入本地',
    className: SAVE_STATUS_CLASS.muted
  }
}

export function getAiChapterDraftWordLabel(wordCount: number): string {
  return `AI 草稿 ${getWordCountLabel(wordCount)}`
}

export function getWordCountLabel(wordCount: number): string {
  return `${Math.max(0, Math.round(wordCount)).toLocaleString()} 字`
}
