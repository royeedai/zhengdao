import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpen, FilePlus2, Pencil, Save, Search, Trash2, X } from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'
import { useToastStore } from '@/stores/toast-store'
import { useBookStore } from '@/stores/book-store'

/**
 * DI-02 v1 — 学术作品的引文管理面板
 *
 * 提供 BibTeX 风格的引文列表 (citekey 唯一) 与表单, 支持 7 种 citation_type
 * (book / journal / conference / website / thesis / report / other)。所有字段
 * 共用一张表, 表单按当前 type 高亮"建议必填"字段, 但不强校验, 留给作者
 * 灵活填写。
 *
 * 入口: AiAssistantDock 顶部 toolbar 的 BookOpen 按钮, 仅 academic 题材
 * 显示 (DI-02 v2 引文 picker / v3 文末参考文献 Skill 跟进)。
 */

export type CitationType =
  | 'book'
  | 'journal'
  | 'conference'
  | 'website'
  | 'thesis'
  | 'report'
  | 'other'

interface CitationRow {
  id: number
  book_id: number
  citekey: string
  citation_type: CitationType
  authors: string
  title: string
  year: number | null
  publisher: string
  journal: string
  volume: string
  issue: string
  pages: string
  doi: string
  url: string
  notes: string
  created_at: string
  updated_at: string
}

const TYPE_OPTIONS: Array<{ id: CitationType; label: string }> = [
  { id: 'book', label: '专著 / 图书' },
  { id: 'journal', label: '期刊论文' },
  { id: 'conference', label: '会议论文' },
  { id: 'website', label: '网页 / 在线' },
  { id: 'thesis', label: '学位论文' },
  { id: 'report', label: '研究报告' },
  { id: 'other', label: '其他' }
]

/** 各 citation_type 的"建议必填"字段, 表单上对这些字段加视觉重点。 */
const SUGGESTED_FIELDS_BY_TYPE: Record<CitationType, Array<keyof CitationDraft>> = {
  book: ['authors', 'title', 'publisher', 'year'],
  journal: ['authors', 'title', 'journal', 'year', 'volume', 'issue', 'pages'],
  conference: ['authors', 'title', 'publisher', 'year', 'pages'],
  website: ['authors', 'title', 'url', 'year'],
  thesis: ['authors', 'title', 'publisher', 'year'],
  report: ['authors', 'title', 'publisher', 'year'],
  other: ['authors', 'title']
}

interface CitationDraft {
  citekey: string
  citation_type: CitationType
  authors: string
  title: string
  year: string
  publisher: string
  journal: string
  volume: string
  issue: string
  pages: string
  doi: string
  url: string
  notes: string
}

const EMPTY_DRAFT: CitationDraft = {
  citekey: '',
  citation_type: 'journal',
  authors: '',
  title: '',
  year: '',
  publisher: '',
  journal: '',
  volume: '',
  issue: '',
  pages: '',
  doi: '',
  url: '',
  notes: ''
}

function citationToDraft(c: CitationRow): CitationDraft {
  return {
    citekey: c.citekey,
    citation_type: c.citation_type,
    authors: c.authors,
    title: c.title,
    year: c.year != null ? String(c.year) : '',
    publisher: c.publisher,
    journal: c.journal,
    volume: c.volume,
    issue: c.issue,
    pages: c.pages,
    doi: c.doi,
    url: c.url,
    notes: c.notes
  }
}

export default function CitationsManagerModal() {
  const closeModal = useUIStore((s) => s.closeModal)
  const bookId = useBookStore((s) => s.currentBookId)
  const addToast = useToastStore((s) => s.addToast)

  const [rows, setRows] = useState<CitationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeId, setActiveId] = useState<number | 'new' | null>(null)
  const [draft, setDraft] = useState<CitationDraft>(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    if (!bookId) return
    setLoading(true)
    try {
      const list = (await window.api.listCitations(bookId)) as CitationRow[]
      setRows(list)
    } finally {
      setLoading(false)
    }
  }, [bookId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.citekey.toLowerCase().includes(q) ||
        r.authors.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q)
    )
  }, [rows, search])

  const handleNew = () => {
    setActiveId('new')
    setDraft({ ...EMPTY_DRAFT })
  }

  const handleSelect = (row: CitationRow) => {
    setActiveId(row.id)
    setDraft(citationToDraft(row))
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定要删除这条引文? 已经引用过的章节需要手动调整。')) return
    await window.api.deleteCitation(id)
    addToast('success', '已删除引文')
    if (activeId === id) {
      setActiveId(null)
      setDraft(EMPTY_DRAFT)
    }
    await refresh()
  }

  const handleSave = async () => {
    if (!bookId) return
    if (!draft.citekey.trim()) {
      addToast('error', '请填写 citekey (BibTeX 风格的引用键, 例如 zhang2024-mlmodel)')
      return
    }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        citekey: draft.citekey.trim(),
        citation_type: draft.citation_type,
        authors: draft.authors,
        title: draft.title,
        year: draft.year.trim() === '' ? null : Number.parseInt(draft.year, 10),
        publisher: draft.publisher,
        journal: draft.journal,
        volume: draft.volume,
        issue: draft.issue,
        pages: draft.pages,
        doi: draft.doi,
        url: draft.url,
        notes: draft.notes
      }
      if (activeId === 'new') {
        await window.api.createCitation(bookId, payload)
        addToast('success', `已新增引文 ${draft.citekey.trim()}`)
      } else if (typeof activeId === 'number') {
        await window.api.updateCitation(activeId, payload)
        addToast('success', '引文已更新')
      }
      await refresh()
      const updatedRow = ((await window.api.listCitations(bookId)) as CitationRow[]).find(
        (r) => r.citekey === draft.citekey.trim()
      )
      if (updatedRow) {
        setActiveId(updatedRow.id)
        setDraft(citationToDraft(updatedRow))
      }
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : '保存引文失败')
    } finally {
      setSaving(false)
    }
  }

  const suggested = SUGGESTED_FIELDS_BY_TYPE[draft.citation_type]
  const isSuggested = (key: keyof CitationDraft) => suggested.includes(key)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-2xl">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border-primary)] bg-[var(--bg-primary)] px-5">
          <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
            <BookOpen size={18} className="text-[var(--accent-secondary)]" />
            学术引文管理 (DI-02)
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
            aria-label="关闭"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid flex-1 grid-cols-[280px_1fr] overflow-hidden">
          <aside className="flex flex-col border-r border-[var(--border-primary)] bg-[var(--bg-primary)]">
            <div className="border-b border-[var(--border-primary)] p-3">
              <div className="relative">
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索 citekey / 作者 / 标题..."
                  className="field w-full pl-7 text-xs"
                />
              </div>
              <button
                type="button"
                onClick={handleNew}
                className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded bg-[var(--accent-primary)] px-3 py-1.5 text-xs text-[var(--accent-contrast)] transition hover:bg-[var(--accent-secondary)]"
              >
                <FilePlus2 size={12} /> 新增引文
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-xs text-[var(--text-muted)]">加载中...</div>
              ) : filtered.length === 0 ? (
                <div className="p-4 text-center text-xs text-[var(--text-muted)]">
                  {rows.length === 0 ? '暂无引文, 点击上方"新增引文"开始。' : '没有匹配的引文。'}
                </div>
              ) : (
                <ul className="divide-y divide-[var(--border-primary)]">
                  {filtered.map((row) => {
                    const active = activeId === row.id
                    return (
                      <li key={row.id}>
                        <button
                          type="button"
                          onClick={() => handleSelect(row)}
                          className={`flex w-full items-start justify-between gap-2 p-3 text-left transition ${
                            active
                              ? 'bg-[var(--accent-surface)] text-[var(--accent-secondary)]'
                              : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                                {row.citation_type}
                              </span>
                              <span className="font-mono text-[10px] text-[var(--text-muted)]">@{row.citekey}</span>
                              {row.year != null && (
                                <span className="text-[10px] text-[var(--text-muted)]">{row.year}</span>
                              )}
                            </div>
                            <div className="mt-1 truncate text-xs font-bold">
                              {row.title || '<未命名>'}
                            </div>
                            <div className="mt-0.5 truncate text-[10px] text-[var(--text-muted)]">
                              {row.authors || '<未填作者>'}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              void handleDelete(row.id)
                            }}
                            className="shrink-0 rounded p-1 text-[var(--text-muted)] transition hover:text-red-500"
                            aria-label="删除"
                            title="删除"
                          >
                            <Trash2 size={12} />
                          </button>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </aside>

          <main className="overflow-y-auto p-5">
            {activeId == null ? (
              <div className="flex h-full items-center justify-center text-center text-sm text-[var(--text-muted)]">
                选择左侧的引文进入编辑, 或点击"新增引文"。
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
                  <Pencil size={14} className="text-[var(--accent-secondary)]" />
                  {activeId === 'new' ? '新增引文' : `编辑引文 @${draft.citekey}`}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="citekey *" suggested>
                    <input
                      type="text"
                      value={draft.citekey}
                      onChange={(e) => setDraft((cur) => ({ ...cur, citekey: e.target.value }))}
                      placeholder="zhang2024-mlmodel"
                      className="field font-mono text-xs"
                      disabled={activeId !== 'new'}
                    />
                  </Field>
                  <Field label="类型">
                    <select
                      value={draft.citation_type}
                      onChange={(e) =>
                        setDraft((cur) => ({ ...cur, citation_type: e.target.value as CitationType }))
                      }
                      className="field text-xs"
                    >
                      {TYPE_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="作者" suggested={isSuggested('authors')}>
                    <input
                      type="text"
                      value={draft.authors}
                      onChange={(e) => setDraft((cur) => ({ ...cur, authors: e.target.value }))}
                      placeholder="张三, 李四"
                      className="field text-xs"
                    />
                  </Field>
                  <Field label="年份" suggested={isSuggested('year')}>
                    <input
                      type="number"
                      value={draft.year}
                      onChange={(e) => setDraft((cur) => ({ ...cur, year: e.target.value }))}
                      placeholder="2024"
                      className="field text-xs"
                    />
                  </Field>
                  <Field label="标题" suggested={isSuggested('title')} fullWidth>
                    <input
                      type="text"
                      value={draft.title}
                      onChange={(e) => setDraft((cur) => ({ ...cur, title: e.target.value }))}
                      placeholder="基于深度学习的文本生成方法研究"
                      className="field text-xs"
                    />
                  </Field>
                  <Field label="出版方 / 学校" suggested={isSuggested('publisher')}>
                    <input
                      type="text"
                      value={draft.publisher}
                      onChange={(e) => setDraft((cur) => ({ ...cur, publisher: e.target.value }))}
                      placeholder="清华大学出版社"
                      className="field text-xs"
                    />
                  </Field>
                  <Field label="期刊 / 会议" suggested={isSuggested('journal')}>
                    <input
                      type="text"
                      value={draft.journal}
                      onChange={(e) => setDraft((cur) => ({ ...cur, journal: e.target.value }))}
                      placeholder="计算机学报 / NeurIPS 2024"
                      className="field text-xs"
                    />
                  </Field>
                  <Field label="卷号" suggested={isSuggested('volume')}>
                    <input
                      type="text"
                      value={draft.volume}
                      onChange={(e) => setDraft((cur) => ({ ...cur, volume: e.target.value }))}
                      placeholder="47"
                      className="field text-xs"
                    />
                  </Field>
                  <Field label="期号" suggested={isSuggested('issue')}>
                    <input
                      type="text"
                      value={draft.issue}
                      onChange={(e) => setDraft((cur) => ({ ...cur, issue: e.target.value }))}
                      placeholder="3"
                      className="field text-xs"
                    />
                  </Field>
                  <Field label="页码" suggested={isSuggested('pages')}>
                    <input
                      type="text"
                      value={draft.pages}
                      onChange={(e) => setDraft((cur) => ({ ...cur, pages: e.target.value }))}
                      placeholder="123-145"
                      className="field text-xs"
                    />
                  </Field>
                  <Field label="DOI">
                    <input
                      type="text"
                      value={draft.doi}
                      onChange={(e) => setDraft((cur) => ({ ...cur, doi: e.target.value }))}
                      placeholder="10.1145/1234567"
                      className="field font-mono text-xs"
                    />
                  </Field>
                  <Field label="URL" suggested={isSuggested('url')}>
                    <input
                      type="url"
                      value={draft.url}
                      onChange={(e) => setDraft((cur) => ({ ...cur, url: e.target.value }))}
                      placeholder="https://..."
                      className="field font-mono text-xs"
                    />
                  </Field>
                  <Field label="备注 / 引用上下文" fullWidth>
                    <textarea
                      rows={3}
                      value={draft.notes}
                      onChange={(e) => setDraft((cur) => ({ ...cur, notes: e.target.value }))}
                      placeholder="引文标签 / 重点结论 / 计划在哪一章引用 ..."
                      className="field min-h-[60px] resize-vertical text-xs"
                    />
                  </Field>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveId(null)
                      setDraft(EMPTY_DRAFT)
                    }}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving}
                    className="inline-flex items-center gap-1 rounded bg-[var(--accent-primary)] px-3 py-1.5 text-xs text-[var(--accent-contrast)] transition hover:bg-[var(--accent-secondary)] disabled:opacity-40"
                  >
                    <Save size={12} /> {saving ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
  suggested,
  fullWidth
}: {
  label: string
  children: React.ReactNode
  suggested?: boolean
  fullWidth?: boolean
}) {
  return (
    <div className={fullWidth ? 'col-span-2' : ''}>
      <label
        className={`mb-1 block text-[11px] uppercase tracking-wider ${
          suggested ? 'text-[var(--accent-secondary)]' : 'text-[var(--text-muted)]'
        }`}
      >
        {label}
        {suggested && <span className="ml-1 normal-case tracking-normal text-[10px]">(建议填写)</span>}
      </label>
      {children}
    </div>
  )
}
