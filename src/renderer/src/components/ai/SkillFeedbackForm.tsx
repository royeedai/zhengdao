import { useState } from 'react'
import { CheckCircle2, Loader2, MessageSquareText } from 'lucide-react'
import { useToastStore } from '@/stores/toast-store'
import { SKILL_FEEDBACK_NOTE_MAX, type SkillFeedbackSurface } from '../../../../shared/skill-feedback'

interface Props {
  runId: string
  skillId: string
  surface: SkillFeedbackSurface
  className?: string
}

export function SkillFeedbackForm({ runId, skillId, surface, className = '' }: Props) {
  const addToast = useToastStore((s) => s.addToast)
  const [expanded, setExpanded] = useState(false)
  const [rating, setRating] = useState<number | null>(null)
  const [weeklyUseIntent, setWeeklyUseIntent] = useState<boolean | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (submitted) {
    return (
      <div className={`flex items-center gap-1.5 rounded border border-[var(--success-border)] bg-[var(--success-surface)] px-2 py-1.5 text-xs text-[var(--success-primary)] ${className}`}>
        <CheckCircle2 size={12} />
        反馈已提交
      </div>
    )
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className={`inline-flex items-center gap-1 text-xs text-[var(--accent-secondary)] hover:underline ${className}`}
      >
        <MessageSquareText size={12} />
        提交反馈
      </button>
    )
  }

  const canSubmit = rating != null && weeklyUseIntent != null && !submitting

  const handleSubmit = async () => {
    if (!canSubmit || rating == null || weeklyUseIntent == null) return
    setSubmitting(true)
    try {
      const res = await window.api.skillSubmitFeedback({
        runId,
        rating,
        weeklyUseIntent,
        notes: notes.trim() || undefined,
        surface
      })
      if (res.error) throw new Error(res.error)
      setSubmitted(true)
      addToast('success', 'Skill 反馈已提交')
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : '反馈提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-2 ${className}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-xs font-bold text-[var(--text-primary)]">Skill 反馈</div>
        <div className="font-mono text-[10px] text-[var(--text-muted)]">{skillId}</div>
      </div>

      <div className="space-y-2">
        <div>
          <div className="mb-1 text-[11px] text-[var(--text-muted)]">评分</div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={`h-7 w-7 rounded border text-xs font-semibold transition ${
                  rating === n
                    ? 'border-[var(--accent-border)] bg-[var(--accent-surface)] text-[var(--accent-secondary)]'
                    : 'border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-muted)] hover:border-[var(--border-secondary)]'
                }`}
                aria-pressed={rating === n}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 text-[11px] text-[var(--text-muted)]">每周使用意愿</div>
          <div className="flex gap-1">
            {[
              { value: true, label: '会' },
              { value: false, label: '不会' }
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => setWeeklyUseIntent(option.value)}
                className={`rounded border px-2 py-1 text-xs transition ${
                  weeklyUseIntent === option.value
                    ? 'border-[var(--accent-border)] bg-[var(--accent-surface)] text-[var(--accent-secondary)]'
                    : 'border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-muted)] hover:border-[var(--border-secondary)]'
                }`}
                aria-pressed={weeklyUseIntent === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <textarea
          rows={2}
          value={notes}
          maxLength={SKILL_FEEDBACK_NOTE_MAX}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="备注（可选）"
          className="field min-h-[44px] resize-vertical text-xs"
        />

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            收起
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            className="inline-flex items-center gap-1 rounded bg-[var(--accent-primary)] px-3 py-1.5 text-xs text-[var(--accent-contrast)] transition hover:bg-[var(--accent-secondary)] disabled:opacity-40"
          >
            {submitting ? <Loader2 size={12} className="animate-spin" /> : null}
            {submitting ? '提交中...' : '提交'}
          </button>
        </div>
      </div>
    </div>
  )
}
