import { describe, expect, it } from 'vitest'
import {
  draftTitle,
  ensureHtmlContent,
  formatProviderLabel,
  plainToHtml,
  withLocalRagChip
} from '../ai-assistant-helpers'
import type { AiAssistantContext, AiDraftPayload } from '@/utils/ai/assistant-workflow'

/**
 * SPLIT-006 phase 1 — boundary-lock for the AiAssistantPanel +
 * BookshelfCreationAssistantPanel shared helpers.
 *
 * These were private inside AiAssistantDock.tsx (2530 LOC).
 * The split exposed them; this test pins the contract so a future
 * tweak to the HTML escaping or draft-title fallbacks must land
 * with an updated assertion.
 */

describe('plainToHtml', () => {
  it('wraps single paragraph in <p>', () => {
    expect(plainToHtml('hello')).toBe('<p>hello</p>')
  })

  it('escapes HTML special chars', () => {
    expect(plainToHtml('<b>x</b> & "y"')).toBe('<p>&lt;b&gt;x&lt;/b&gt; &amp; "y"</p>')
  })

  it('uses double-newline as paragraph break', () => {
    expect(plainToHtml('line1\n\nline2')).toBe('<p>line1</p><p>line2</p>')
  })

  it('converts single newlines inside a paragraph to <br>', () => {
    expect(plainToHtml('a\nb')).toBe('<p>a<br>b</p>')
  })
})

describe('ensureHtmlContent', () => {
  it('returns empty string for empty input', () => {
    expect(ensureHtmlContent('')).toBe('')
    expect(ensureHtmlContent('   ')).toBe('')
  })

  it('passes through HTML-shaped text untouched', () => {
    expect(ensureHtmlContent('<p>already</p>')).toBe('<p>already</p>')
  })

  it('wraps plain text via plainToHtml', () => {
    expect(ensureHtmlContent('plain')).toBe('<p>plain</p>')
  })
})

describe('draftTitle', () => {
  it('prefers explicit title field', () => {
    expect(draftTitle({ kind: 'create_chapter', title: 'My Title' } as AiDraftPayload)).toBe('My Title')
  })

  it('falls back to name when title missing', () => {
    expect(draftTitle({ kind: 'create_character', name: 'Hero' } as AiDraftPayload)).toBe('Hero')
  })

  it('falls back to localized kind label when both missing', () => {
    expect(draftTitle({ kind: 'insert_text' } as AiDraftPayload)).toBe('插入正文')
    expect(draftTitle({ kind: 'create_chapter' } as AiDraftPayload)).toBe('创建章节')
    expect(draftTitle({ kind: 'create_character' } as AiDraftPayload)).toBe('创建角色')
  })

  it('falls back to generic AI 草稿 for unknown kinds', () => {
    expect(draftTitle({ kind: 'something_else' } as unknown as AiDraftPayload)).toBe('AI 草稿')
  })
})

describe('formatProviderLabel', () => {
  it.each([
    ['zhengdao_official', '官方 AI'],
    ['openai', 'OpenAI 兼容'],
    ['gemini', 'Gemini API'],
    ['gemini_cli', 'Gemini CLI'],
    ['ollama', 'Ollama'],
    ['custom_openai', '自定义兼容'],
    [null, '未配置'],
    [undefined, '未配置'],
    ['unknown_provider', '未配置']
  ])('formatProviderLabel(%j) -> %s', (input, expected) => {
    expect(formatProviderLabel(input as string | null | undefined)).toBe(expected)
  })
})

describe('withLocalRagChip', () => {
  it('appends the local_rag chip when missing', () => {
    const ctx: AiAssistantContext = { contextText: '', chips: [] }
    const next = withLocalRagChip(ctx)
    expect(next.chips.map((c) => c.id)).toContain('local_rag')
    expect(next.chips.find((c) => c.id === 'local_rag')?.enabled).toBe(true)
  })

  it('keeps the existing context unchanged when local_rag is already present', () => {
    const ctx: AiAssistantContext = {
      contextText: '',
      chips: [{ id: 'local_rag', kind: 'local_rag', label: '本地片段', enabled: false }]
    }
    expect(withLocalRagChip(ctx)).toBe(ctx)
  })
})
