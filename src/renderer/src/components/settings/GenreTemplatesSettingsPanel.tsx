import { useEffect, useMemo, useState } from 'react'
import { Copy, PencilRuler, Plus, Save, Star, Trash2 } from 'lucide-react'
import { useSettingsStore } from '@/stores/settings-store'
import {
  createEmptyGenreTemplateDraft,
  draftFromGenreTemplate,
  GenreTemplateEditor,
  GenreTemplatePreview,
  type GenreTemplateDraft
} from './GenreTemplateEditor'

export default function GenreTemplatesSettingsPanel() {
  const templates = useSettingsStore((s) => s.templates)
  const defaultGenreTemplateId = useSettingsStore((s) => s.defaultGenreTemplateId)
  const loadingTemplates = useSettingsStore((s) => s.loadingTemplates)
  const createGenreTemplate = useSettingsStore((s) => s.createGenreTemplate)
  const updateGenreTemplate = useSettingsStore((s) => s.updateGenreTemplate)
  const copyGenreTemplate = useSettingsStore((s) => s.copyGenreTemplate)
  const deleteGenreTemplate = useSettingsStore((s) => s.deleteGenreTemplate)
  const setDefaultGenreTemplateId = useSettingsStore((s) => s.setDefaultGenreTemplateId)

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [draft, setDraft] = useState<GenreTemplateDraft>(() => createEmptyGenreTemplateDraft())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (templates.length === 0) {
      setSelectedId(null)
      setDraft(createEmptyGenreTemplateDraft())
      return
    }
    if (!selectedId || !templates.some((template) => template.id === selectedId)) {
      const next = defaultGenreTemplateId && templates.some((template) => template.id === defaultGenreTemplateId)
        ? defaultGenreTemplateId
        : templates[0].id
      setSelectedId(next)
    }
  }, [defaultGenreTemplateId, selectedId, templates])

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedId) || null,
    [selectedId, templates]
  )

  useEffect(() => {
    if (selectedTemplate) setDraft(draftFromGenreTemplate(selectedTemplate))
  }, [selectedTemplate])

  const hasUnsavedChanges = useMemo(() => {
    if (!selectedTemplate) return false
    return JSON.stringify(draftFromGenreTemplate(selectedTemplate)) !== JSON.stringify(draft)
  }, [draft, selectedTemplate])

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="space-y-3">
        <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <PencilRuler size={16} />
            系统题材模板库
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
            在这里维护系统级题材模板。编辑后的模板只影响后续新建作品和后续手动套用，不会反向改已有作品。
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                const created = await createGenreTemplate(createEmptyGenreTemplateDraft())
                if (created) setSelectedId(created.id)
              }}
              className="inline-flex items-center gap-1 rounded border border-[var(--accent-border)] px-3 py-1.5 text-xs text-[var(--accent-secondary)] hover:bg-[var(--accent-surface)]"
            >
              <Plus size={14} />
              新建空模板
            </button>
            <button
              type="button"
              disabled={!selectedTemplate}
              onClick={async () => {
                if (!selectedTemplate) return
                const copied = await copyGenreTemplate(selectedTemplate.id)
                if (copied) setSelectedId(copied.id)
              }}
              className="inline-flex items-center gap-1 rounded border border-[var(--border-secondary)] px-3 py-1.5 text-xs text-[var(--text-secondary)] disabled:opacity-40 hover:border-[var(--accent-border)] hover:text-[var(--text-primary)]"
            >
              <Copy size={14} />
              复制当前模板
            </button>
          </div>
        </div>

        <div className="max-h-[60vh] space-y-2 overflow-y-auto rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-2">
          {loadingTemplates ? (
            <div className="p-3 text-sm text-[var(--text-muted)]">读取模板中…</div>
          ) : templates.length === 0 ? (
            <div className="p-3 text-sm text-[var(--text-muted)]">暂无系统题材模板。</div>
          ) : (
            templates.map((template) => {
              const active = template.id === selectedId
              const isDefault = template.id === defaultGenreTemplateId
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedId(template.id)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    active
                      ? 'border-[var(--accent-border)] bg-[var(--accent-surface)] text-[var(--accent-secondary)]'
                      : 'border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:border-[var(--border-secondary)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold">{template.name}</div>
                    <div className="flex shrink-0 items-center gap-1">
                      {template.is_seed ? (
                        <span className="rounded-full border border-[var(--border-primary)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
                          预设
                        </span>
                      ) : null}
                      {isDefault ? (
                        <span className="rounded-full border border-[var(--warning-border)] bg-[var(--warning-surface)] px-2 py-0.5 text-[10px] text-[var(--warning-primary)]">
                          默认
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-1 text-[11px] text-[var(--text-muted)]">{template.slug}</div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {selectedTemplate ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">{selectedTemplate.name}</div>
              <div className="text-xs text-[var(--text-muted)]">
                {selectedTemplate.is_seed ? '内置预设，可编辑但不可删除。' : '自定义模板，可编辑、复制、删除。'}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  await setDefaultGenreTemplateId(selectedTemplate.id === defaultGenreTemplateId ? null : selectedTemplate.id)
                }}
                className="inline-flex items-center gap-1 rounded border border-[var(--warning-border)] px-3 py-1.5 text-xs text-[var(--warning-primary)] hover:bg-[var(--warning-surface)]"
              >
                <Star size={14} />
                {selectedTemplate.id === defaultGenreTemplateId ? '取消默认' : '设为默认'}
              </button>
              <button
                type="button"
                disabled={selectedTemplate.is_seed === 1}
                onClick={async () => {
                  if (selectedTemplate.is_seed) return
                  await deleteGenreTemplate(selectedTemplate.id)
                }}
                className="inline-flex items-center gap-1 rounded border border-[var(--danger-border)] px-3 py-1.5 text-xs text-[var(--danger-primary)] disabled:opacity-40 hover:bg-[var(--danger-surface)]"
              >
                <Trash2 size={14} />
                删除
              </button>
              <button
                type="button"
                disabled={saving || !hasUnsavedChanges}
                onClick={async () => {
                  setSaving(true)
                  try {
                    await updateGenreTemplate(selectedTemplate.id, draft)
                  } finally {
                    setSaving(false)
                  }
                }}
                className="inline-flex items-center gap-1 rounded bg-[var(--accent-primary)] px-3 py-1.5 text-xs text-[var(--accent-contrast)] disabled:opacity-40 hover:bg-[var(--accent-secondary)]"
              >
                <Save size={14} />
                {saving ? '保存中…' : '保存模板'}
              </button>
            </div>
          </div>

          <GenreTemplateEditor draft={draft} onChange={setDraft} />
          <GenreTemplatePreview template={draft} hint="保存后，新作品和手动套用的作品会使用这里的模板内容。" />
        </div>
      ) : null}
    </div>
  )
}
