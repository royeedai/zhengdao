export const SKILL_FEEDBACK_NOTE_MAX = 1000

export type SkillFeedbackSurface = 'desktop-ai-dock' | 'desktop-skill-dialog'

export interface SkillFeedbackPayload {
  runId: string
  rating: number
  weeklyUseIntent: boolean
  notes?: string
  surface: SkillFeedbackSurface
}

export interface SkillFeedbackApiBody {
  rating: number
  wouldUseWeekly: boolean
  note: string
  surface: SkillFeedbackSurface
}

export interface SkillFeedbackSubmitResult {
  feedback?: unknown
  error?: string
  code?: string
}

export function buildSkillFeedbackApiBody(payload: SkillFeedbackPayload): SkillFeedbackApiBody {
  const runId = payload.runId.trim()
  if (!runId) throw new Error('缺少 Skill runId，无法提交反馈')
  if (!Number.isInteger(payload.rating) || payload.rating < 1 || payload.rating > 5) {
    throw new Error('评分必须是 1 到 5')
  }
  return {
    rating: payload.rating,
    wouldUseWeekly: Boolean(payload.weeklyUseIntent),
    note: (payload.notes || '').trim().slice(0, SKILL_FEEDBACK_NOTE_MAX),
    surface: payload.surface
  }
}
