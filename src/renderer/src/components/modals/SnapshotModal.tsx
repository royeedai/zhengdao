import { useEffect, useMemo, useState } from 'react'
import { History, X, RotateCcw, GitCompare, ArrowLeft } from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'
import { useChapterStore } from '@/stores/chapter-store'
import type { Snapshot } from '@/types'
import { stripHtmlToText } from '@/utils/html-to-text'
import { computeDiff, type DiffLine } from '@/utils/text-diff'

function diffToRows(lines: DiffLine[]) {
  return lines.map((line) => {
    if (line.type === 'same') {
      return {
        left: line.text,
        right: line.text,
        leftClass: 'bg-transparent',
        rightClass: 'bg-transparent'
      }
    }
    if (line.type === 'remove') {
      return {
        left: line.text,
        right: '',
        leftClass: 'bg-red-950/70 text-red-100',
        rightClass: 'bg-[#141414]'
      }
    }
    return {
      left: '',
      right: line.text,
      leftClass: 'bg-[#141414]',
      rightClass: 'bg-emerald-950/70 text-emerald-100'
    }
  })
}

export default function SnapshotModal() {
  const closeModal = useUIStore((s) => s.closeModal)
  const openModal = useUIStore((s) => s.openModal)
  const currentChapter = useChapterStore((s) => s.currentChapter)
  const forceReloadCurrentChapter = useChapterStore((s) => s.forceReloadCurrentChapter)

  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [loading, setLoading] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [diffSnapshot, setDiffSnapshot] = useState<Snapshot | null>(null)

  useEffect(() => {
    if (!currentChapter?.id) return
    setLoading(true)
    void window.api
      .getSnapshots(currentChapter.id)
      .then((rows) => {
        setSnapshots(rows as Snapshot[])
      })
      .finally(() => setLoading(false))
  }, [currentChapter?.id])

  const diffRows = useMemo(() => {
    if (!diffSnapshot || !currentChapter) return []
    const oldText = stripHtmlToText(diffSnapshot.content || '')
    const newText = stripHtmlToText(currentChapter.content || '')
    return diffToRows(computeDiff(oldText, newText))
  }, [diffSnapshot, currentChapter])

  const restore = (snap: Snapshot) => {
    openModal('confirm', {
      title: '确认还原',
      message: `将还原到 ${new Date(snap.created_at).toLocaleString('zh-CN')} 的版本，当前内容将被覆盖。`,
      onConfirm: async () => {
        if (!currentChapter) return
        setRestoring(true)
        try {
          await window.api.updateChapter(currentChapter.id, {
            content: snap.content || '',
            word_count: snap.word_count
          })
          await forceReloadCurrentChapter()
        } finally {
          setRestoring(false)
        }
        closeModal()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4 pointer-events-auto">
      <div
        className={`bg-[#1a1a1a] border border-[#333] w-full ${diffSnapshot ? 'max-w-5xl' : 'max-w-lg'} rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]`}
      >
        <div className="h-12 border-b border-[#2a2a2a] bg-[#141414] flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center space-x-2 text-sky-400 font-bold">
            <History size={18} />
            <span>{diffSnapshot ? '版本对比' : '章节快照'}</span>
          </div>
          <button onClick={closeModal} className="text-slate-500 hover:text-slate-300 transition">
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-[#2a2a2a]">
          <p className="text-xs text-slate-500">
            当前章节：<span className="text-slate-300">{currentChapter?.title || '—'}</span>
          </p>
        </div>

        {diffSnapshot ? (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="px-4 py-2 border-b border-[#2a2a2a] flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDiffSnapshot(null)}
                className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300"
              >
                <ArrowLeft size={14} /> 返回列表
              </button>
              <span className="text-[11px] text-slate-500 font-mono">
                快照 {new Date(diffSnapshot.created_at).toLocaleString('zh-CN')}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-px bg-[#333] shrink-0 border-b border-[#2a2a2a]">
              <div className="bg-[#141414] px-3 py-2 text-[11px] font-semibold text-slate-400 text-center">快照（旧）</div>
              <div className="bg-[#141414] px-3 py-2 text-[11px] font-semibold text-slate-400 text-center">当前（新）</div>
            </div>
            <div className="flex-1 overflow-auto grid grid-cols-2 gap-px bg-[#333] min-h-[240px]">
              <div className="bg-[#0d0d0d] overflow-auto font-mono text-[11px] leading-relaxed">
                {diffRows.map((row, i) => (
                  <pre
                    key={`l-${i}`}
                    className={`whitespace-pre-wrap break-words px-2 py-0.5 border-b border-[#1f1f1f] min-h-[1.25rem] ${row.leftClass}`}
                  >
                    {row.left || '\u00a0'}
                  </pre>
                ))}
              </div>
              <div className="bg-[#0d0d0d] overflow-auto font-mono text-[11px] leading-relaxed">
                {diffRows.map((row, i) => (
                  <pre
                    key={`r-${i}`}
                    className={`whitespace-pre-wrap break-words px-2 py-0.5 border-b border-[#1f1f1f] min-h-[1.25rem] ${row.rightClass}`}
                  >
                    {row.right || '\u00a0'}
                  </pre>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {!currentChapter ? (
              <p className="text-sm text-slate-500 text-center py-8">请先打开一章再查看快照</p>
            ) : loading ? (
              <p className="text-sm text-slate-500 text-center py-8">加载中...</p>
            ) : snapshots.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">暂无自动快照记录</p>
            ) : (
              snapshots.map((snap) => (
                <div
                  key={snap.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg bg-[#141414] border border-[#333] hover:border-sky-500/30 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-sky-400 font-mono">
                      {new Date(snap.created_at).toLocaleString('zh-CN')}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {snap.word_count.toLocaleString()} 字 ·{' '}
                      <span className="text-slate-600 line-clamp-2">
                        {stripHtmlToText(snap.content || '').slice(0, 120)}...
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setDiffSnapshot(snap)}
                      className="flex items-center justify-center gap-1 text-[11px] px-3 py-1.5 rounded bg-violet-600/20 text-violet-300 border border-violet-500/30 hover:bg-violet-600/30"
                    >
                      <GitCompare size={12} /> 对比
                    </button>
                    <button
                      type="button"
                      disabled={restoring}
                      onClick={() => restore(snap)}
                      className="flex items-center justify-center gap-1 text-[11px] px-3 py-1.5 rounded bg-sky-600/20 text-sky-400 border border-sky-500/30 hover:bg-sky-600/30 disabled:opacity-50"
                    >
                      <RotateCcw size={12} /> 还原
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div className="h-12 border-t border-[#2a2a2a] bg-[#141414] flex items-center justify-end px-5 shrink-0">
          <button onClick={closeModal} className="text-xs text-slate-400 hover:text-slate-200">
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
