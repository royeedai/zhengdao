import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpen, Quote, Search, X } from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'
import { useToastStore } from '@/stores/toast-store'
import { useBookStore } from '@/stores/book-store'
import { getActiveEditor } from '@/components/editor/active-editor'

/**
 * DI-02 v2 — 引文 picker
 *
 * 在编辑器中插入 [@citekey] 引用锚点。Modal 关闭时通过 active editor 直接
 * 把文本写入光标处, 不需要 callback 序列化。
 *
 * 锚点在文中以 [@key] 形式呈现, DI-02 v3 文末参考文献 Skill 解析时直接
 * 按这个 pattern 抓 citekey, 不依赖 ProseMirror node spec。
 */

interface CitationRow {
  id: number
  citekey: string
  citation_type: string
  authors: string
  title: string
  year: number | null
  journal: string
  publisher: string
}

export default function CitationPickerModal() {
  const closeModal = useUIStore((s) => s.closeModal)
  const openModal = useUIStore((s) => s.openModal)
  const bookId = useBookStore((s) => s.currentBookId)
  const addToast = useToastStore((s) => s.addToast)

  const [rows, setRows] = useState<CitationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)

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

  useEffect(() => {
    setSelectedIdx(0)
  }, [filtered])

  const handleInsert = (row: CitationRow) => {
    const editor = getActiveEditor()
    if (!editor) {
      addToast('error', '未找到活跃编辑器, 无法插入引文锚点')
      return
    }
    editor.chain().focus().insertContent(`[@${row.citekey}]`).run()
    addToast('success', `已插入引文锚点 [@${row.citekey}]`)
    closeModal()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = filtered[selectedIdx]
      if (target) handleInsert(target)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 p-4 pt-24 backdrop-blur-sm animate-fade-in">
      <div className="flex max-h-[70vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-2xl">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border-primary)] bg-[var(--bg-primary)] px-5">
          <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
            <Quote size={18} className="text-[var(--accent-secondary)]" />
            插入引文 (DI-02)
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

        <div className="border-b border-[var(--border-primary)] p-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="搜索 citekey / 作者 / 标题..."
              className="field w-full pl-9 text-sm"
            />
          </div>
          <div className="mt-1 text-[10px] text-[var(--text-muted)]">
            ↑↓ 选择 · Enter 插入 · Esc 关闭。插入后正文会出现 [@key], DI-02 v3 文末参考文献 Skill 自动按 [@key] 汇总。
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-xs text-[var(--text-muted)]">加载中...</div>
          ) : rows.length === 0 ? (
            <div className="space-y-2 p-6 text-center text-xs text-[var(--text-muted)]">
              <BookOpen size={28} className="mx-auto opacity-40" />
              <div>当前作品没有引文条目。</div>
              <button
                type="button"
                onClick={() => {
                  closeModal()
                  setTimeout(() => openModal('citationsManager'), 50)
                }}
                className="text-[var(--accent-secondary)] hover:underline"
              >
                打开学术引文管理 →
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-[var(--text-muted)]">没有匹配项</div>
          ) : (
            <ul className="divide-y divide-[var(--border-primary)]">
              {filtered.map((row, idx) => {
                const active = idx === selectedIdx
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setSelectedIdx(idx)}
                      onClick={() => handleInsert(row)}
                      className={`w-full px-4 py-2.5 text-left transition ${
                        active
                          ? 'bg-[var(--accent-surface)] text-[var(--accent-secondary)]'
                          : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <span className="rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                          {row.citation_type}
                        </span>
                        <span className="font-mono text-[10px] text-[var(--text-muted)]">@{row.citekey}</span>
                        {row.year != null && (
                          <span className="text-[10px] text-[var(--text-muted)]">{row.year}</span>
                        )}
                      </div>
                      <div className="mt-1 truncate text-sm font-bold">
                        {row.title || '<未命名>'}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
                        {row.authors || '<未填作者>'}
                        {row.journal && ` · ${row.journal}`}
                        {row.publisher && !row.journal && ` · ${row.publisher}`}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
