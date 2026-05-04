import { describe, expect, it, vi } from 'vitest'
import { REMOVE_AI_TONE_SELECTION_INPUT, START_FIRST_CHAPTER_INPUT } from '../chapter-quick-actions'
import { resolveAssistantRequestMaxTokens, runRemoveAiToneQuickAction } from '../useAiAssistantRequest'

describe('resolveAssistantRequestMaxTokens', () => {
  it('keeps ordinary chat and continuation requests on the default budget', () => {
    expect(resolveAssistantRequestMaxTokens({ skillKey: null, userInput: '聊聊人物动机' })).toBe(1400)
    expect(resolveAssistantRequestMaxTokens({ skillKey: 'continue_writing', userInput: '接着写下一段' })).toBe(1400)
  })

  it('uses a larger budget for full chapter drafting', () => {
    expect(resolveAssistantRequestMaxTokens({ skillKey: 'create_chapter', userInput: '生成下一章草稿' })).toBe(4200)
    expect(resolveAssistantRequestMaxTokens({ skillKey: 'continue_writing', userInput: START_FIRST_CHAPTER_INPUT })).toBe(4200)
  })
})

describe('runRemoveAiToneQuickAction', () => {
  it('calls layer2.deslop directly and creates a replace_text draft', async () => {
    const api = {
      aiAddMessage: vi
        .fn()
        .mockResolvedValueOnce({ id: 1, role: 'user', content: REMOVE_AI_TONE_SELECTION_INPUT })
        .mockResolvedValueOnce({ id: 2, role: 'assistant', content: 'done' }),
      aiExecuteSkill: vi.fn().mockResolvedValue({
        runId: 'run-deslop-1',
        modelUsed: 'mock-model',
        output: {
          issues: [{ patternId: 'tier1.众所周知', quote: '众所周知' }],
          rewritten: '林雪必须拿到账册，却被守卫拦下。',
          protectedSpansApplied: [{ start: 0, end: 4, reason: 'custom', text: '林雪' }],
          secondPassAudit: []
        }
      }),
      aiCreateDraft: vi.fn().mockResolvedValue({
        id: 3,
        conversation_id: 8,
        kind: 'replace_text',
        title: '去 AI 味替换草稿（选区）',
        payload: {},
        status: 'pending',
        target_ref: 'chapter:7'
      })
    }

    const result = await runRemoveAiToneQuickAction({
      text: REMOVE_AI_TONE_SELECTION_INPUT,
      bookId: 9,
      conversationId: 8,
      currentChapter: { id: 7, content: '原章正文' },
      selectionChapterId: 7,
      selectionText: '众所周知，林雪站在那里。',
      selectionFrom: 12,
      selectionTo: 24,
      profile: {
        id: 1,
        book_id: 9,
        style_guide: '',
        genre_rules: '',
        content_boundaries: '',
        asset_rules: '',
        rhythm_rules: '',
        context_policy: 'smart_minimal',
        genre: 'webnovel',
        style_fingerprint: '{"voice":"短句、具体动作"}',
        created_at: '',
        updated_at: ''
      },
      contextChips: [],
      intent: { mode: 'skill', skillKey: 'remove_ai_tone', confidence: 1, reason: 'test' },
      api
    })

    expect(api.aiExecuteSkill).toHaveBeenCalledWith(
      'layer2.deslop',
      expect.objectContaining({
        text: '众所周知，林雪站在那里。',
        genre: 'webnovel',
        mode: 'rewrite',
        styleFingerprint: '{"voice":"短句、具体动作"}'
      }),
      { modelHint: 'balanced' }
    )
    expect(api.aiCreateDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'replace_text',
        target_ref: 'chapter:7',
        payload: expect.objectContaining({
          kind: 'replace_text',
          content: '林雪必须拿到账册，却被守卫拦下。',
          original_text: '众所周知，林雪站在那里。',
          selection_chapter_id: 7,
          selection_from: 12,
          selection_to: 24,
          skill_run_id: 'run-deslop-1',
          quality_issues: expect.any(Array),
          protected_spans_applied: expect.any(Array)
        })
      })
    )
    expect(result.draft.kind).toBe('replace_text')
  })
})
