import {
  CREATION_BRIEF_FIELDS,
  normalizeCreationBrief,
  type AssistantCreationBrief
} from '../../../../../shared/ai-book-creation'

/**
 * SPLIT-006 — book-creation brief helpers.
 *
 * Used by the BookshelfCreationAssistantPanel to merge AI-suggested
 * brief partials with the user's edits and to render the brief into
 * a deterministic prompt body the AI can read back.
 */

export function mergeCreationBrief(
  current: AssistantCreationBrief,
  incoming: unknown
): AssistantCreationBrief {
  const normalized = normalizeCreationBrief(incoming)
  const next: AssistantCreationBrief = { ...current }
  const writable = next as Record<string, unknown>
  for (const field of CREATION_BRIEF_FIELDS) {
    const value = normalized[field.key]
    if (typeof value === 'string' && value.trim()) {
      writable[field.key] = value
    }
  }
  if (normalized.author) next.author = normalized.author
  if (normalized.productGenre) next.productGenre = normalized.productGenre
  return { ...next, confirmed: false }
}

export function formatBriefForPrompt(brief: AssistantCreationBrief): string {
  const normalized = normalizeCreationBrief(brief)
  return CREATION_BRIEF_FIELDS.map((field) => {
    const value = String(normalized[field.key] || '').trim()
    const fallback = field.required ? '未确认' : '可由 AI 评估/代写'
    return `${field.required ? '必填' : '可选'}｜${field.label}: ${value || fallback}`
  }).join('\n')
}

export function formatCreationBriefFieldGuide(): string {
  return CREATION_BRIEF_FIELDS.map((field, index) => {
    const options = field.quickOptions
      .map((option, optionIndex) => `${optionIndex + 1}) ${option}`)
      .join('；')
    return `${index + 1}. ${field.required ? '必填' : '可选'}${field.multiSelect ? '｜可多选' : ''}｜${field.label}：${options}`
  }).join('\n')
}
