import { Trash2 } from 'lucide-react'
import type { Book } from '@/types'
import { useBookStore } from '@/stores/book-store'
import { useUIStore } from '@/stores/ui-store'

export default function BookCard({ book }: { book: Book }) {
  const openBook = useBookStore((s) => s.openBook)
  const openModal = useUIStore((s) => s.openModal)

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    openModal('confirm', {
      title: '删除作品',
      message: `确定要删除《${book.title}》吗？此操作不可恢复，所有章节、人物卡、剧情节点都将被删除。`,
      onConfirm: () => useBookStore.getState().deleteBook(book.id)
    })
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openBook(book.id)}
      onKeyDown={(e) => e.key === 'Enter' && openBook(book.id)}
      className="bg-[#1e1e1e] border border-[#333] hover:border-emerald-500/50 rounded-xl p-5 cursor-pointer transition-all shadow-md group relative overflow-hidden focus:outline-none focus:border-emerald-500"
    >
      <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/60 group-hover:bg-emerald-500 transition" />
      <div className="flex items-start justify-between mb-4 pl-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-emerald-900/30 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg">
            {book.title.charAt(0)}
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-base">《{book.title}》</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{book.author || '未署名'}</p>
          </div>
        </div>
        <button
          onClick={handleDelete}
          aria-label={`删除《${book.title}》`}
          className="p-1.5 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all rounded"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div className="pl-2 space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-500">总字数</span>
          <span className="text-emerald-400 font-mono font-bold">{(book.total_words || 0).toLocaleString()} 字</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">最近编辑</span>
          <span className="text-slate-400">{new Date(book.updated_at).toLocaleDateString('zh-CN')}</span>
        </div>
      </div>
    </div>
  )
}
