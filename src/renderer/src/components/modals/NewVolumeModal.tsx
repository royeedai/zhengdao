import { useState } from 'react'
import { Layers, X, Save } from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'
import { useChapterStore } from '@/stores/chapter-store'

export default function NewVolumeModal() {
  const { modalData, closeModal } = useUIStore()
  const createVolume = useChapterStore((s) => s.createVolume)
  const data = modalData as { book_id?: number } | null
  const bookId = data?.book_id

  const [title, setTitle] = useState('')

  const handleSubmit = async () => {
    if (!bookId || !title.trim()) return
    await createVolume(bookId, title.trim())
    closeModal()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#1a1a1a] border border-[#333] w-[440px] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="h-12 border-b border-[#2a2a2a] bg-[#141414] flex items-center justify-between px-5">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold">
            <Layers size={18} />
            <span>新建卷</span>
          </div>
          <button onClick={closeModal} className="text-slate-500 hover:text-slate-300 transition">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] text-slate-500 uppercase mb-1">卷标题</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
              placeholder="例如：第一卷 潜龙勿用"
            />
          </div>
        </div>
        <div className="h-14 border-t border-[#2a2a2a] bg-[#141414] flex items-center justify-end px-5 gap-3">
          <button onClick={closeModal} className="px-4 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition">
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !bookId}
            className="flex items-center gap-1 px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded"
          >
            <Save size={14} /> 创建
          </button>
        </div>
      </div>
    </div>
  )
}
