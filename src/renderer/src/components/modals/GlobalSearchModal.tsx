import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, FileSearch, RefreshCw } from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'
import { useChapterStore } from '@/stores/chapter-store'
import { useBookStore } from '@/stores/book-store'
import DialogShell from '@/components/shared/DialogShell'
import { useListKeyboard } from '@/hooks/useListKeyboard'

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
  const [scopeAllBooks, setScopeAllBooks] = useState(() => currentBookId === null)
  const [hits, setHits] = useState<Hit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retrySignal, setRetrySignal] = useState(0)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (currentBookId === null && !scopeAllBooks) setScopeAllBooks(true)
  }, [currentBookId, scopeAllBooks])

  const bookIdArg = useMemo(() => {
    if (scopeAllBooks) return undefined
    return currentBookId ?? undefined
  }, [scopeAllBooks, currentBookId])
  const shouldSearch = debounced.length > 0 && (scopeAllBooks || bookIdArg !== undefined)

  useEffect(() => {
    if (!shouldSearch) {
      setHits([])
      setError(null)
      setLoading(false)
      return
    }
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
  }, [bookIdArg, debounced, retrySignal, shouldSearch])

  const visibleHits = shouldSearch ? hits : []

  const onPick = async (hit: Hit) => {
    if (hit.book_id !== currentBookId) {
      const ok = window.confirm('该搜索结果属于其他作品。打开后会切换当前作品并跳到对应章节，继续？')
      if (!ok) return
      openBook(hit.book_id)
      await loadVolumes(hit.book_id)
    }
    await selectChapter(hit.id)
    closeModal()
  }

  const { selectedIndex, setCursor, onKeyDown } = useListKeyboard({
    items: visibleHits,
    onPick: (hit) => void onPick(hit),
    onEscape: closeModal
  })

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-search-index="${selectedIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  return (
    <DialogShell
      title="搜内容"
      icon={<FileSearch size={18} className="shrink-0 text-[var(--accent-primary)]" />}
      onClose={closeModal}
      widthClassName="max-w-3xl"
      maxHeightClassName="max-h-[min(680px,calc(100vh-7rem))]"
    >
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--border-primary)] px-3 py-2.5">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="搜内容（当前版本：章节标题与正文）…"
          className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
        />
        <div className="flex shrink-0 overflow-hidden rounded-lg border border-[var(--border-primary)] text-xs">
          <button
            type="button"
            disabled={currentBookId === null}
            onClick={() => setScopeAllBooks(false)}
            className={`px-3 py-1.5 transition ${
              !scopeAllBooks
                ? 'bg-[var(--accent-surface)] font-semibold text-[var(--accent-secondary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
            } disabled:cursor-not-allowed disabled:opacity-45`}
          >
            当前作品
          </button>
          <button
            type="button"
            onClick={() => setScopeAllBooks(true)}
            className={`border-l border-[var(--border-primary)] px-3 py-1.5 transition ${
              scopeAllBooks
                ? 'bg-[var(--accent-surface)] font-semibold text-[var(--accent-secondary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
            }`}
          >
            全部作品
          </button>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--border-primary)] px-3 py-2 text-[11px]">
        <span className="rounded-full border border-[var(--accent-border)] bg-[var(--accent-surface)] px-2 py-0.5 font-semibold text-[var(--accent-secondary)]">
          章节内容
        </span>
        {['角色', '设定', '剧情资产'].map((kind) => (
          <span
            key={kind}
            title="沿用现有能力，本轮不新增 searchAssets 后端接口"
            className="rounded-full border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-2 py-0.5 text-[var(--text-muted)] opacity-70"
          >
            {kind} 待接入
          </span>
        ))}
      </div>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-16 animate-pulse rounded-lg bg-[var(--bg-tertiary)]" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 p-8 text-center text-sm text-[var(--danger-primary)]">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} /> 搜索失败：{error}
            </div>
            <button
              type="button"
              onClick={() => setRetrySignal((signal) => signal + 1)}
              className="inline-flex items-center gap-2 rounded-md border border-[var(--danger-border)] bg-[var(--danger-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--danger-primary)]"
            >
              <RefreshCw size={13} /> 重试
            </button>
          </div>
        ) : visibleHits.length === 0 ? (
          <p className="p-8 text-center text-sm text-[var(--text-muted)]">
            {debounced ? '未找到匹配章节。当前搜索只覆盖章节标题和正文。' : '输入关键字开始搜索章节内容'}
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border-primary)]">
            {visibleHits.map((hit, index) => (
              <li key={`${hit.book_id}-${hit.id}`}>
                <button
                  type="button"
                  data-search-index={index}
                  onClick={() => void onPick(hit)}
                  onMouseEnter={() => setCursor(index)}
                  className={`w-full px-4 py-3 text-left transition ${
                    index === selectedIndex
                      ? 'bg-[var(--accent-surface)] ring-1 ring-inset ring-[var(--accent-border)]'
                      : 'hover:bg-[var(--bg-tertiary)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-[var(--text-primary)]">{hit.title}</span>
                    <span className="shrink-0 text-[10px] text-[var(--text-muted)]">{hit.volume_title || '未分卷'}</span>
                  </div>
                  <div
                    className="mt-1 line-clamp-3 text-xs text-[var(--text-secondary)] [&_.fts-hit]:bg-amber-500/25 [&_.fts-hit]:text-amber-100"
                    dangerouslySetInnerHTML={{ __html: hit.snippet }}
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DialogShell>
  )
}
