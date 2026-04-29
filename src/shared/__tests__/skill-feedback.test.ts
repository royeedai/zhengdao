import { describe, expect, it } from 'vitest'
import { buildSkillFeedbackApiBody, SKILL_FEEDBACK_NOTE_MAX } from '../skill-feedback'

describe('buildSkillFeedbackApiBody', () => {
  it('maps desktop naming to the backend feedback contract', () => {
    expect(
      buildSkillFeedbackApiBody({
        runId: '00000000-0000-0000-0000-000000000001',
        rating: 4,
        weeklyUseIntent: true,
        notes: '  有用，但建议更短  ',
        surface: 'desktop-skill-dialog'
      })
    ).toEqual({
      rating: 4,
      wouldUseWeekly: true,
      note: '有用，但建议更短',
      surface: 'desktop-skill-dialog'
    })
  })

  it('rejects invalid ratings before reaching the backend', () => {
    expect(() =>
      buildSkillFeedbackApiBody({
        runId: 'run-1',
        rating: 0,
        weeklyUseIntent: false,
        surface: 'desktop-ai-dock'
      })
    ).toThrow('评分必须是 1 到 5')
  })

  it('clips notes to the backend maximum length', () => {
    const body = buildSkillFeedbackApiBody({
      runId: 'run-1',
      rating: 5,
      weeklyUseIntent: false,
      notes: 'x'.repeat(SKILL_FEEDBACK_NOTE_MAX + 10),
      surface: 'desktop-ai-dock'
    })

    expect(body.note).toHaveLength(SKILL_FEEDBACK_NOTE_MAX)
  })
})
