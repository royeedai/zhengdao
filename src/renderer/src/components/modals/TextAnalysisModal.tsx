import { useMemo } from 'react'
import { X } from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'
import { useChapterStore } from '@/stores/chapter-store'
import { analyzeText } from '@/utils/text-analysis'

function htmlToPlain(html: string) {
  const d = document.createElement('div')
  d.innerHTML = html || ''
  return (d.textContent || '').replace(/\s+/g, ' ').trim()
}

export default function TextAnalysisModal() {
  const closeModal = useUIStore((s) => s.closeModal)
  const modalData = useUIStore((s) => s.modalData) as {
    text?: string
    scope?: 'selection' | 'chapter'
  } | null
  const currentChapter = useChapterStore((s) => s.currentChapter)

  const plain = useMemo(() => {
    if (modalData?.scope === 'chapter') return htmlToPlain(currentChapter?.content || '')
    const t = modalData?.text?.trim()
    if (t) return t
    return htmlToPlain(currentChapter?.content || '')
  }, [modalData, currentChapter])

  const result = useMemo(() => analyzeText(plain), [plain])
  const maxFreq = result.topWords[0]?.count ?? 1

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1a1a1a] border border-[#333] w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="h-12 border-b border-[#2a2a2a] bg-[#141414] flex items-center justify-between px-5 shrink-0">
          <span className="text-cyan-400 font-bold text-sm">文本分析</span>
          <button type="button" onClick={closeModal} className="text-slate-500 hover:text-slate-300 transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-5 text-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-lg bg-[#141414] border border-[#2a2a2a] p-3">
              <div className="text-slate-500">字符</div>
              <div className="text-lg font-mono text-slate-200">{result.totalCharacters.toLocaleString()}</div>
            </div>
            <div className="rounded-lg bg-[#141414] border border-[#2a2a2a] p-3">
              <div className="text-slate-500">词单位</div>
              <div className="text-lg font-mono text-slate-200">{result.wordCount.toLocaleString()}</div>
            </div>
            <div className="rounded-lg bg-[#141414] border border-[#2a2a2a] p-3">
              <div className="text-slate-500">句子</div>
              <div className="text-lg font-mono text-slate-200">{result.sentenceCount}</div>
            </div>
            <div className="rounded-lg bg-[#141414] border border-[#2a2a2a] p-3">
              <div className="text-slate-500">段落</div>
              <div className="text-lg font-mono text-slate-200">{result.paragraphCount}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-[#141414] border border-[#2a2a2a] p-3">
              <div className="text-slate-500">平均句长（词单位）</div>
              <div className="text-base font-mono text-emerald-400">{result.avgSentenceLength.toFixed(1)}</div>
            </div>
            <div className="rounded-lg bg-[#141414] border border-[#2a2a2a] p-3">
              <div className="text-slate-500">平均段长（词单位）</div>
              <div className="text-base font-mono text-emerald-400">{result.avgParagraphLength.toFixed(1)}</div>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-400 mb-2">词频 Top 20</div>
            <div className="space-y-2">
              {result.topWords.map(({ word, count }) => (
                <div key={word} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-8 shrink-0">{word}</span>
                  <div className="flex-1 h-2.5 bg-[#222] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-900 to-cyan-500"
                      style={{ width: `${Math.max(6, (count / maxFreq) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 w-10 text-right">{count}</span>
                </div>
              ))}
              {result.topWords.length === 0 && (
                <div className="text-xs text-slate-500">停用词过滤后暂无高频词</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
