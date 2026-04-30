import { describe, expect, it } from 'vitest'
import type { Chapter, Volume } from '@/types'
import {
  REMOVE_AI_TONE_CHAPTER_INPUT,
  REMOVE_AI_TONE_SELECTION_INPUT,
  START_FIRST_CHAPTER_INPUT,
  buildChapterEditorQuickActions,
  isBlankChapterContent
} from '../chapter-quick-actions'

function chapter(input: Partial<Chapter>): Chapter {
  return {
    id: 1,
    volume_id: 1,
    title: '第一章 开始',
    content: '',
    word_count: 0,
    sort_order: 0,
    created_at: '',
    updated_at: '',
    ...input
  }
}

function volume(chapters: Chapter[]): Volume {
  return {
    id: 1,
    book_id: 1,
    title: '第一卷',
    sort_order: 0,
    created_at: '',
    chapters
  }
}

describe('chapter quick actions', () => {
  it('recognizes empty editor HTML as a blank chapter', () => {
    expect(isBlankChapterContent('')).toBe(true)
    expect(isBlankChapterContent('<p></p>')).toBe(true)
    expect(isBlankChapterContent('<p>正文</p>')).toBe(false)
  })

  it('guides a blank first chapter toward AI drafting instead of generic continuation', () => {
    const first = chapter({})
    const actions = buildChapterEditorQuickActions({
      currentChapter: first,
      volumes: [volume([first])],
      hasSelection: false
    })

    expect(actions[0]).toMatchObject({
      key: 'continue_writing',
      label: '开始写第一章',
      description: '基于作品设定、本章摘要和现有资产生成正文草稿。',
      disabled: false,
      input: START_FIRST_CHAPTER_INPUT
    })
  })

  it('exposes a deslop / 去 AI 味 quick action chapter-mode by default', () => {
    const ch = chapter({ id: 7, title: '第七章 · 雨夜', content: '<p>正文</p>' })
    const actions = buildChapterEditorQuickActions({
      currentChapter: ch,
      volumes: [volume([ch])],
      hasSelection: false
    })

    const removeTone = actions.find((a) => a.key === 'remove_ai_tone')
    expect(removeTone).toBeDefined()
    expect(removeTone).toMatchObject({
      label: '去 AI 味（本章）',
      disabled: false,
      input: REMOVE_AI_TONE_CHAPTER_INPUT
    })
  })

  it('switches deslop label + input when the user has an active selection', () => {
    const ch = chapter({ id: 7, content: '<p>正文</p>' })
    const actions = buildChapterEditorQuickActions({
      currentChapter: ch,
      volumes: [volume([ch])],
      hasSelection: true
    })

    const removeTone = actions.find((a) => a.key === 'remove_ai_tone')
    expect(removeTone).toMatchObject({
      label: '去 AI 味（选区）',
      input: REMOVE_AI_TONE_SELECTION_INPUT
    })
  })

  it('disables deslop when there is no chapter and no selection', () => {
    const actions = buildChapterEditorQuickActions({
      currentChapter: null,
      volumes: [],
      hasSelection: false
    })
    const removeTone = actions.find((a) => a.key === 'remove_ai_tone')
    expect(removeTone?.disabled).toBe(true)
  })
})
