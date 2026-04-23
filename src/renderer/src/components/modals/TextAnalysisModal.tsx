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
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--border-primary)] bg-[var(--surface-elevated)] shadow-2xl">
        <div className="flex h-12 items-center justify-between border-b border-[var(--border-primary)] bg-[var(--bg-primary)] px-5 shrink-0">
          <span className="text-sm font-bold text-[var(--accent-secondary)]">文本分析</span>
          <button
            type="button"
            onClick={closeModal}
            className="text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-5 text-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3">
              <div className="text-[var(--text-muted)]">字符</div>
              <div className="text-lg font-mono text-[var(--text-primary)]">{result.totalCharacters.toLocaleString()}</div>
            </div>
            <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3">
              <div className="text-[var(--text-muted)]">词单位</div>
              <div className="text-lg font-mono text-[var(--text-primary)]">{result.wordCount.toLocaleString()}</div>
            </div>
            <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3">
              <div className="text-[var(--text-muted)]">句子</div>
              <div className="text-lg font-mono text-[var(--text-primary)]">{result.sentenceCount}</div>
            </div>
            <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3">
              <div className="text-[var(--text-muted)]">段落</div>
              <div className="text-lg font-mono text-[var(--text-primary)]">{result.paragraphCount}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3">
              <div className="text-[var(--text-muted)]">平均句长（词单位）</div>
              <div className="text-base font-mono text-[var(--accent-secondary)]">{result.avgSentenceLength.toFixed(1)}</div>
            </div>
            <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3">
              <div className="text-[var(--text-muted)]">平均段长（词单位）</div>
              <div className="text-base font-mono text-[var(--accent-secondary)]">{result.avgParagraphLength.toFixed(1)}</div>
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">词频 Top 20</div>
            <div className="space-y-2">
              {result.topWords.map(({ word, count }) => (
                <div key={word} className="flex items-center gap-2">
                  <span className="w-8 shrink-0 text-xs text-[var(--text-muted)]">{word}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]"
                      style={{ width: `${Math.max(6, (count / maxFreq) * 100)}%` }}
                    />
                  </div>
                  <span className="w-10 text-right font-mono text-[11px] text-[var(--text-secondary)]">{count}</span>
                </div>
              ))}
              {result.topWords.length === 0 && (
                <div className="text-xs text-[var(--text-muted)]">停用词过滤后暂无高频词</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
