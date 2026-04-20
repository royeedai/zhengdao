import { useEffect, useState } from 'react'
import { PenTool, Plus, HelpCircle, Search, LayoutGrid, List, Trash2 } from 'lucide-react'
import { useBookStore } from '@/stores/book-store'
import { useUIStore } from '@/stores/ui-store'
import BookCard from './BookCard'
import UpdateActionButton from '@/components/shared/UpdateActionButton'

type SortBy = 'updated' | 'created' | 'words' | 'title'

export default function BookshelfPage() {
  const { books, loadBooks } = useBookStore()
  const openBook = useBookStore((s) => s.openBook)
  const openModal = useUIStore((s) => s.openModal)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<SortBy>('updated')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadBooks()
  }, [])

  const sortedBooks = [...books].sort((a, b) => {
    switch (sortBy) {
      case 'updated':
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      case 'created':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'words':
        return (b.total_words || 0) - (a.total_words || 0)
      case 'title':
        return a.title.localeCompare(b.title, 'zh-CN')
      default:
        return 0
    }
  })

  const filteredBooks = sortedBooks.filter(
    (b) =>
      !searchQuery ||
      b.title.includes(searchQuery) ||
      (b.author || '').includes(searchQuery)
  )

  return (
    <div className="flex flex-col h-screen bg-[#141414]">
      {/* macOS 标题栏拖拽区域 */}
      <div className="h-12 border-b border-[#2a2a2a] bg-[#1a1a1a] flex items-center justify-between shrink-0 drag-region">
        <div className="flex items-center space-x-2 text-emerald-500 font-bold tracking-wide text-lg pl-20 no-drag">
          <PenTool size={22} />
          <span>证道</span>
          <span className="text-[10px] text-slate-500 font-normal ml-1 border border-slate-600 rounded px-1">
            Pro
          </span>
        </div>
        <div className="pr-4 no-drag flex items-center gap-2">
          <UpdateActionButton variant="bookshelf" />
          <button
            onClick={() => openModal('help')}
            className="p-2 text-slate-500 hover:text-emerald-400 rounded transition"
            aria-label="使用帮助"
            title="使用帮助 (F1)"
          >
            <HelpCircle size={18} />
          </button>
          <button
            onClick={() => openModal('newBook')}
            className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition shadow-lg shadow-emerald-900/20"
          >
            <Plus size={16} className="mr-1.5" /> 新建作品
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-8 lg:p-12">
        {books.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <PenTool size={64} className="text-slate-700 mb-6" />
            <h2 className="text-2xl font-bold text-slate-400 mb-3">开始你的创作之旅</h2>
            <p className="text-slate-500 mb-8 max-w-md">
              证道是为长篇网文作者打造的沉浸式写作工具，帮助你驾驭百万字级别的宏大叙事。
            </p>
            <button
              onClick={() => openModal('newBook')}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-base font-bold transition shadow-lg shadow-emerald-900/30"
            >
              <Plus size={18} className="inline mr-2 -mt-0.5" />
              新建你的第一部作品
            </button>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                我的作品 ({filteredBooks.length})
              </h2>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-[#1e1e1e] border border-[#333] rounded px-2 py-1.5">
                  <Search size={14} className="text-slate-500 mr-1.5 shrink-0" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索作品..."
                    className="bg-transparent border-none focus:outline-none text-xs text-slate-200 w-32"
                  />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="bg-[#1e1e1e] border border-[#333] rounded px-2 py-1.5 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="updated">最近编辑</option>
                  <option value="created">创建时间</option>
                  <option value="words">总字数</option>
                  <option value="title">书名</option>
                </select>
                <div className="flex border border-[#333] rounded overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 ${viewMode === 'grid' ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
                    aria-label="网格视图"
                  >
                    <LayoutGrid size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 ${viewMode === 'list' ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
                    aria-label="列表视图"
                  >
                    <List size={14} />
                  </button>
                </div>
              </div>
            </div>
            {filteredBooks.length === 0 ? (
              <p className="text-center text-slate-500 text-sm py-12">没有匹配的作品</p>
            ) : viewMode === 'list' ? (
              <div className="space-y-2">
                {filteredBooks.map((book) => (
                  <div
                    key={book.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openBook(book.id)}
                    onKeyDown={(e) => e.key === 'Enter' && openBook(book.id)}
                    className="flex items-center bg-[#1e1e1e] border border-[#333] hover:border-emerald-500/50 rounded-lg px-4 py-3 cursor-pointer transition group"
                  >
                    <div className="w-10 h-10 rounded bg-emerald-900/30 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold mr-4 shrink-0">
                      {book.title.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-100 text-sm truncate">《{book.title}》</h3>
                      <p className="text-[11px] text-slate-500 truncate">{book.author || '未署名'}</p>
                    </div>
                    <div className="text-xs text-emerald-400 font-mono mr-8 shrink-0 hidden sm:block">
                      {(book.total_words || 0).toLocaleString()} 字
                    </div>
                    <div className="text-xs text-slate-500 mr-4 shrink-0 hidden md:block">
                      {new Date(book.updated_at).toLocaleDateString('zh-CN')}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        openModal('confirm', {
                          title: '删除作品',
                          message: `确定要删除《${book.title}》吗？此操作不可恢复，所有章节、人物卡、剧情节点都将被删除。`,
                          onConfirm: () => useBookStore.getState().deleteBook(book.id)
                        })
                      }}
                      className="p-1.5 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition shrink-0"
                      aria-label={`删除《${book.title}》`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredBooks.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
