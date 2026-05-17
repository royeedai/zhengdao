import { memo, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { ImagePlus, MoreHorizontal, RefreshCw, Trash2 } from 'lucide-react'
import type { Book } from '@/types'
import { useBookStore } from '@/stores/book-store'
import { useUIStore } from '@/stores/ui-store'
import { useToastStore } from '@/stores/toast-store'
import BookCover from './BookCover'

function BookCard({ book }: { book: Book }) {
  const openBook = useBookStore((s) => s.openBook)
  const loadBooks = useBookStore((s) => s.loadBooks)
  const openModal = useUIStore((s) => s.openModal)
  const addToast = useToastStore((s) => s.addToast)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  const handleDelete = (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    openModal('confirm', {
      title: '删除作品',
      message: `确定要删除《${book.title}》吗？此操作不可恢复，所有章节、人物卡、剧情节点都将被删除。`,
      onConfirm: () => useBookStore.getState().deleteBook(book.id)
    })
  }

  const handleChooseCover = async (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    setMenuOpen(false)
    try {
      const result = await window.api.book.chooseCoverImage(book.id)
      if (result) {
        await loadBooks()
        addToast('success', '已更新作品封面')
      }
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : String(error))
    }
  }

  const handleRegenerateCover = async (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    setMenuOpen(false)
    try {
      await window.api.book.regenerateAutoCover(book.id)
      await loadBooks()
      addToast('success', '已重置为自动封面')
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openBook(book.id)}
      onKeyDown={(e) => e.key === 'Enter' && openBook(book.id)}
      className="group relative cursor-pointer overflow-hidden rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] shadow-md transition-all hover:border-[var(--accent-border)] focus:outline-none focus:border-[var(--accent-primary)]"
    >
      <div className="relative aspect-[3/4] border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]">
        <BookCover book={book} className="h-full w-full" fallbackClassName="text-3xl" />
        <div className="absolute right-2 top-2" ref={menuRef}>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              setMenuOpen((open) => !open)
            }}
            title="作品操作"
            aria-label={`打开《${book.title}》操作菜单`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="rounded bg-[var(--bg-primary)]/90 p-1.5 text-[var(--text-secondary)] opacity-0 shadow transition hover:text-[var(--accent-secondary)] group-hover:opacity-100 group-focus-within:opacity-100"
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-8 z-20 min-w-[152px] rounded-lg border border-[var(--border-primary)] bg-[var(--surface-elevated)] py-1 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                role="menuitem"
                onClick={handleChooseCover}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
              >
                <ImagePlus size={14} /> 更换封面
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleRegenerateCover}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
              >
                <RefreshCw size={14} /> 重置自动封面
              </button>
              <div className="my-1 border-t border-[var(--border-primary)]" />
              <button
                type="button"
                role="menuitem"
                onClick={handleDelete}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[var(--danger-primary)] hover:bg-[var(--danger-surface)]"
              >
                <Trash2 size={14} /> 删除作品
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="space-y-4 p-4">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-base font-bold text-[var(--text-primary)]" title={`《${book.title}》`}>
            《{book.title}》
          </h3>
          <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">{book.author || '未署名'}</p>
        </div>
      </div>
      <div className="space-y-2 px-4 pb-4 text-xs">
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">总字数</span>
          <span className="text-[var(--accent-secondary)] font-mono font-bold">{(book.total_words || 0).toLocaleString()} 字</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">最近编辑</span>
          <span className="text-[var(--text-secondary)]">{new Date(book.updated_at).toLocaleDateString('zh-CN')}</span>
        </div>
      </div>
    </div>
  )
}

export default memo(BookCard)
