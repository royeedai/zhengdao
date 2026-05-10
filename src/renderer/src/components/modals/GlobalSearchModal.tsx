import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, Search, X } from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'
import { useChapterStore } from '@/stores/chapter-store'
import { useBookStore } from '@/stores/book-store'

type Hit = {
  id: number
  title: string
  snippet: string
  volume_title: string
  book_id: number
}

export default function GlobalSearchModal() {
  const closeModal = useUIStore((s) => s.closeModal)
  const selectChapter = useChapterStore((s) => s.selectChapter)
  const loadVolumes = useChapterStore((s) => s.loadVolumes)
  const openBook = useBookStore((s) => s.openBook)
  const currentBookId = useBookStore((s) => s.currentBookId)

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [scopeAllBooks, setScopeAllBooks] = useState(false)
  const [hits, setHits] = useState<Hit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cursor, setCursor] = useState(0)

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 300)
    return () => window.clearTimeout(t)
  }, [query])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const bookIdArg = useMemo(() => {
    if (scopeAllBooks) return undefined
    return currentBookId ?? undefined
  }, [scopeAllBooks, currentBookId])
  const shouldSearch = debounced.length > 0 && (scopeAllBooks || bookIdArg !== undefined)

  useEffect(() => {
    if (!shouldSearch) return
    let cancelled = false

    const runSearch = async () => {
      setLoading(true)
      setError(null)
      try {
        const rows = (await window.api.searchChapters(debounced, bookIdArg)) as Hit[]
        if (!cancelled) setHits(rows)
      } catch (err) {
        if (!cancelled) {
          setHits([])
          setError(err instanceof Error ? err.message : '搜索失败，请稍后重试。')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void runSearch()
    return () => {
      cancelled = true
    }
  }, [bookIdArg, debounced, shouldSearch])

  const visibleHits = shouldSearch ? hits : []
  const showLoading = shouldSearch ? loading : false
  const visibleError = shouldSearch ? error : null
  const selectedIndex = visibleHits.length === 0 ? 0 : Math.min(cursor, visibleHits.length - 1)

  useEffect(() => {
    setCursor(0)
  }, [debounced, scopeAllBooks])

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-search-index="${selectedIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const onPick = async (hit: Hit) => {
    if (hit.book_id !== currentBookId) {
      const ok = window.confirm('该搜索结果属于其他作品，打开后会切换当前作品。继续？')
      if (!ok) return
      openBook(hit.book_id)
      await loadVolumes(hit.book_id)
    }
    await selectChapter(hit.id)
    closeModal()
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/70 backdrop-blur-md animate-fade-in pointer-events-auto">
      <div className="flex flex-col max-w-3xl w-full mx-auto mt-16 mb-8 px-4 flex-1 min-h-0">
        <div className="flex items-center gap-3 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-4 py-3 shadow-xl">
          <Search size={20} className="text-[var(--accent-primary)] shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                if (visibleHits.length > 0) setCursor((index) => (index + 1) % visibleHits.length)
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault()
                if (visibleHits.length > 0) setCursor((index) => (index - 1 + visibleHits.length) % visibleHits.length)
              }
              if (event.key === 'Enter') {
                event.preventDefault()
                const hit = visibleHits[selectedIndex]
                if (hit) void onPick(hit)
              }
            }}
            placeholder="搜内容（当前版本：章节标题与正文）..."
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none min-w-0"
          />
          <div className="flex rounded-lg border border-[var(--border-primary)] overflow-hidden shrink-0 text-xs">
            <button
              type="button"
              onClick={() => setScopeAllBooks(false)}
              className={`px-3 py-1.5 transition ${
                !scopeAllBooks
                  ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] font-medium'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              仅当前作品
            </button>
            <button
              type="button"
              onClick={() => setScopeAllBooks(true)}
              className={`px-3 py-1.5 transition border-l border-[var(--border-primary)] ${
                scopeAllBooks
                  ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] font-medium'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              全部作品
            </button>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>

        {!scopeAllBooks && currentBookId === null && (
          <p className="mt-4 text-center text-sm text-amber-400/90">请先打开一本书以使用「仅当前作品」搜索。</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="rounded-full border border-[var(--accent-border)] bg-[var(--accent-surface)] px-2 py-0.5 font-semibold text-[var(--accent-secondary)]">
            章节内容
          </span>
          {['角色', '设定', '剧情资产'].map((kind) => (
            <span
              key={kind}
              title="沿用现有能力，本轮不新增 searchAssets 后端接口"
              className="rounded-full border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-2 py-0.5 text-[var(--text-muted)] opacity-70"
            >
              {kind} 即将支持
            </span>
          ))}
        </div>

        <div ref={listRef} className="mt-4 flex-1 overflow-y-auto rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] min-h-0">
          {showLoading ? (
            <p className="p-8 text-center text-sm text-[var(--text-muted)]">搜索中...</p>
          ) : visibleError ? (
            <div className="flex items-center justify-center gap-2 p-8 text-center text-sm text-[var(--danger-primary)]">
              <AlertCircle size={16} /> 搜索失败：{visibleError}
            </div>
          ) : visibleHits.length === 0 ? (
            <p className="p-8 text-center text-sm text-[var(--text-muted)]">
              {debounced ? '未找到匹配章节' : '输入关键字开始搜索'}
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border-primary)]">
              {visibleHits.map((h, index) => (
                <li key={`${h.book_id}-${h.id}`}>
                  <button
                    type="button"
                    data-search-index={index}
                    onClick={() => void onPick(h)}
                    onMouseEnter={() => setCursor(index)}
                    className={`w-full text-left px-4 py-3 transition ${
                      index === selectedIndex
                        ? 'bg-[var(--accent-surface)] ring-1 ring-inset ring-[var(--accent-border)]'
                        : 'hover:bg-[var(--bg-tertiary)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-[var(--text-primary)] truncate">{h.title}</span>
                      <span className="text-[10px] text-[var(--text-muted)] shrink-0">{h.volume_title}</span>
                    </div>
                    <div
                      className="mt-1 text-xs text-[var(--text-secondary)] line-clamp-3 [&_.fts-hit]:bg-amber-500/25 [&_.fts-hit]:text-amber-100"
                      dangerouslySetInnerHTML={{ __html: h.snippet }}
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
