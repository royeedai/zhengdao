import { Check, ClipboardCheck, Trash2 } from 'lucide-react'
import { buildDraftPreviewModel } from '../draft-preview'

/**
 * SPLIT-006 phase 2 — draft basket panel.
 *
 * Pending drafts produced by the AI request flow. The panel itself only
 * renders + emits; mutating draft status (apply / dismiss) is handled by
 * the parent panel via callbacks.
 */

export interface DraftListPanelDraft {
  id: number
  conversation_id?: number | null
  kind: string
  title: string
  payload: Record<string, unknown>
  status: 'pending' | 'applied' | 'dismissed'
  target_ref?: string
}

export interface DraftListPanelProps {
  drafts: DraftListPanelDraft[]
  onApply: (draft: DraftListPanelDraft) => void
  onDismiss: (draftId: number) => void
}

export function DraftListPanel(props: DraftListPanelProps): JSX.Element | null {
  if (props.drafts.length === 0) return null

  return (
    <div className="space-y-2 rounded-lg border border-[var(--warning-border)] bg-[var(--warning-surface)] p-2">
      <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--warning-primary)]">
        <ClipboardCheck size={14} /> 草稿篮
      </div>
      {props.drafts.map((draft) => {
        const preview = buildDraftPreviewModel(draft)
        return (
          <div
            key={draft.id}
            className="rounded border border-[var(--border-primary)] bg-[var(--bg-primary)] p-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-xs font-bold text-[var(--text-primary)]">
                  {preview.title || draft.title || draft.kind}
                </div>
                {preview.summary && (
                  <div className="mt-1 max-h-24 overflow-y-auto text-[11px] leading-relaxed text-[var(--text-muted)] whitespace-pre-wrap">
                    {preview.summary}
                  </div>
                )}
                {preview.fields.length > 0 && (
                  <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {preview.fields.map((field) => (
                      <div
                        key={`${draft.id}-${field.label}`}
                        className="rounded border border-[var(--border-primary)] px-2 py-1"
                      >
                        <div className="text-[10px] text-[var(--text-muted)]">{field.label}</div>
                        <div className="truncate text-[11px] text-[var(--text-secondary)]">
                          {field.value}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => props.onApply(draft)}
                  title="确认应用"
                  className="rounded bg-[var(--accent-primary)] p-1.5 text-[var(--accent-contrast)] hover:bg-[var(--accent-secondary)]"
                >
                  <Check size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => props.onDismiss(draft.id)}
                  title="丢弃草稿"
                  className="rounded border border-[var(--border-secondary)] p-1.5 text-[var(--text-muted)] hover:text-[var(--danger-primary)]"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
