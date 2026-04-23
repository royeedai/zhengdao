import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Download, X, FileText, File, BookOpen } from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'
import { useBookStore } from '@/stores/book-store'
import { generateTxt } from '@/utils/export-txt'
import { generateDocx } from '@/utils/export-docx'
import { generatePDFHtml, chaptersToVolumeSlices } from '@/utils/export-pdf'
import { exportToMarkdown } from '@/utils/export-md'
import { exportToReadingHtml } from '@/utils/export-html-read'
import { PLATFORM_PRESETS, getPresetById, type PlatformPreset } from '@/utils/platform-presets'
import type { Volume } from '@/types'

type Format = 'txt' | 'docx' | 'pdf' | 'md' | 'html'

type ExportChapterRow = {
  id: number
  title: string
  content: string | null
  volume_title: string
}

export default function ExportModal() {
  const closeModal = useUIStore((s) => s.closeModal)
  const books = useBookStore((s) => s.books)
  const currentBookId = useBookStore((s) => s.currentBookId)
  const book = books.find((b) => b.id === currentBookId)

  const [format, setFormat] = useState<Format>('txt')
  const [presetId, setPresetId] = useState<string>('qidian')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<'success' | 'error' | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [volumes, setVolumes] = useState<Volume[]>([])
  const [expandedVol, setExpandedVol] = useState<Set<number>>(new Set())
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!currentBookId) return
    void window.api.getVolumesWithChapters(currentBookId).then((vols) => {
      const list = vols as Volume[]
      setVolumes(list)
      const ids = new Set<number>()
      for (const v of list) {
        for (const ch of v.chapters || []) ids.add(ch.id)
      }
      setSelectedIds(ids)
      setExpandedVol(new Set(list.map((v) => v.id)))
    })
  }, [currentBookId])

  const preset: PlatformPreset | undefined = useMemo(() => {
    if (format !== 'txt') return undefined
    return getPresetById(presetId)
  }, [format, presetId])

  const toggleVolExpand = (id: number) => {
    setExpandedVol((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleChapter = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const toggleVolumeAll = (volume: Volume, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const ch of volume.chapters || []) {
        if (checked) next.add(ch.id)
        else next.delete(ch.id)
      }
      return next
    })
  }

  const selectAll = () => {
    const ids = new Set<number>()
    for (const v of volumes) {
      for (const ch of v.chapters || []) ids.add(ch.id)
    }
    setSelectedIds(ids)
  }

  const clearAll = () => setSelectedIds(new Set())

  const runExport = async () => {
    if (!currentBookId || !book) return
    setBusy(true)
    setResult(null)
    setErrorMsg('')
    try {
      const allChapters = (await window.api.getAllChaptersForBook(currentBookId)) as ExportChapterRow[]
      const chapters = allChapters.filter((c) => selectedIds.has(c.id))

      if (chapters.length === 0) {
        setResult('error')
        setErrorMsg('请至少勾选一个章节')
        return
      }

      let data: Uint8Array | string
      let ext: string
      let filterName: string

      if (format === 'docx') {
        data = await generateDocx(book.title, book.author || '', chapters)
        ext = 'docx'
        filterName = 'Word 文档'
      } else if (format === 'txt') {
        data = generateTxt(book.title, book.author || '', chapters, preset)
        ext = 'txt'
        filterName = '纯文本'
      } else if (format === 'md') {
        data = exportToMarkdown(book.title, book.author || '', chapters)
        ext = 'md'
        filterName = 'Markdown'
      } else if (format === 'html') {
        data = exportToReadingHtml(book.title, book.author || '', chapters)
        ext = 'html'
        filterName = 'HTML'
      } else {
        const html = generatePDFHtml(book.title, book.author || '', chaptersToVolumeSlices(chapters))
        const saveResult = await window.api.showSaveDialog({
          title: '导出 PDF',
          defaultPath: `${book.title}.pdf`,
          filters: [{ name: 'PDF', extensions: ['pdf'] }]
        })
        if (saveResult.canceled || !saveResult.filePath) return
        await window.api.exportPdf(html, saveResult.filePath)
        setResult('success')
        setTimeout(() => closeModal(), 1200)
        return
      }

      const saveResult = await window.api.showSaveDialog({
        title: '导出作品',
        defaultPath: `${book.title}.${ext}`,
        filters: [{ name: filterName, extensions: [ext] }]
      })

      if (saveResult.canceled || !saveResult.filePath) return

      if (typeof data === 'string') {
        const blob = new Blob([data], { type: 'text/plain' })
        const buf = new Uint8Array(await blob.arrayBuffer())
        await window.api.writeFile(saveResult.filePath, buf)
      } else {
        await window.api.writeFile(saveResult.filePath, data)
      }
      setResult('success')
      setTimeout(() => closeModal(), 1200)
    } catch (err) {
      setResult('error')
      setErrorMsg(err instanceof Error ? err.message : '导出失败，请重试')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-[var(--border-primary)] bg-[var(--surface-elevated)] shadow-2xl">
        <div className="flex h-12 items-center justify-between border-b border-[var(--border-primary)] bg-[var(--bg-primary)] px-5 shrink-0">
          <div className="flex items-center space-x-2 font-bold text-[var(--accent-secondary)]">
            <Download size={18} />
            <span>导出全书</span>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {result === 'success' && (
            <div className="flex items-center gap-2 rounded-lg border border-[var(--success-border)] bg-[var(--success-surface)] p-3 text-xs font-medium text-[var(--success-primary)]">
              导出成功！
            </div>
          )}
          {result === 'error' && (
            <div className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-surface)] p-3 text-xs font-medium text-[var(--danger-primary)]">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="mb-2 block text-[11px] uppercase text-[var(--text-muted)]">发布平台预设（仅 TXT）</label>
            <select
              value={presetId}
              onChange={(e) => setPresetId(e.target.value)}
              disabled={format !== 'txt'}
              className={`w-full rounded border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none ${
                format !== 'txt' ? 'opacity-40' : ''
              }`}
            >
              {PLATFORM_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.description}
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-[var(--text-muted)]">
            选择导出格式；TXT 可使用平台排版预设。HTML 为单文件阅读排版，可用 Calibre 等转为 ePub。
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(
              [
                ['txt', 'TXT', FileText],
                ['docx', 'Word', File],
                ['pdf', 'PDF', BookOpen],
                ['md', 'Markdown', FileText],
                ['html', 'HTML·ePub', FileText]
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFormat(key)}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-xs font-bold transition ${
                  format === key
                    ? 'border-[var(--accent-border)] bg-[var(--accent-surface)] text-[var(--accent-secondary)]'
                    : 'border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-[var(--border-secondary)]'
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] uppercase text-[var(--text-muted)]">导出范围</label>
              <div className="flex gap-2">
                <button type="button" onClick={selectAll} className="text-[11px] text-[var(--accent-secondary)] hover:text-[var(--accent-primary)]">
                  全选
                </button>
                <button type="button" onClick={clearAll} className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  取消全选
                </button>
              </div>
            </div>
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-2 text-xs">
              {volumes.map((vol) => {
                const chs = vol.chapters || []
                const volChecked =
                  chs.length > 0 && chs.every((c) => selectedIds.has(c.id))
                const expanded = expandedVol.has(vol.id)
                return (
                  <div key={vol.id}>
                    <div className="flex items-center gap-2 py-1">
                      <button
                        type="button"
                        onClick={() => toggleVolExpand(vol.id)}
                        className="p-0.5 text-[var(--text-muted)]"
                      >
                        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                      <input
                        type="checkbox"
                        checked={volChecked}
                        onChange={(e) => toggleVolumeAll(vol, e.target.checked)}
                        className="rounded border-[var(--border-secondary)]"
                      />
                      <span className="truncate font-medium text-[var(--text-primary)]">{vol.title}</span>
                    </div>
                    {expanded &&
                      chs.map((ch) => (
                        <label
                          key={ch.id}
                          className="flex cursor-pointer items-center gap-2 py-0.5 pl-8 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(ch.id)}
                            onChange={(e) => toggleChapter(ch.id, e.target.checked)}
                            className="rounded border-[var(--border-secondary)]"
                          />
                          <span className="truncate">{ch.title}</span>
                        </label>
                      ))}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex h-14 items-center justify-end gap-3 border-t border-[var(--border-primary)] bg-[var(--bg-primary)] px-5 shrink-0">
          <button type="button" onClick={closeModal} className="px-4 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition">
            取消
          </button>
          <button
            type="button"
            onClick={() => void runExport()}
            disabled={busy || !currentBookId}
            className="flex items-center gap-1 rounded bg-[var(--accent-primary)] px-4 py-1.5 text-xs text-[var(--accent-contrast)] transition hover:bg-[var(--accent-secondary)] disabled:opacity-40"
          >
            <Download size={14} /> {busy ? '导出中...' : '选择路径并导出'}
          </button>
        </div>
      </div>
    </div>
  )
}
