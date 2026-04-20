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
      <div className="bg-[#1a1a1a] border border-[#333] w-full max-w-xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="h-12 border-b border-[#2a2a2a] bg-[#141414] flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold">
            <Download size={18} />
            <span>导出全书</span>
          </div>
          <button type="button" onClick={closeModal} className="text-slate-500 hover:text-slate-300 transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {result === 'success' && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
              导出成功！
            </div>
          )}
          {result === 'error' && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-[11px] text-slate-500 uppercase mb-2">发布平台预设（仅 TXT）</label>
            <select
              value={presetId}
              onChange={(e) => setPresetId(e.target.value)}
              disabled={format !== 'txt'}
              className={`w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500 ${
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

          <p className="text-xs text-slate-500">
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
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                    : 'border-[#333] text-slate-400 hover:border-slate-500'
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] text-slate-500 uppercase">导出范围</label>
              <div className="flex gap-2">
                <button type="button" onClick={selectAll} className="text-[11px] text-emerald-500 hover:text-emerald-400">
                  全选
                </button>
                <button type="button" onClick={clearAll} className="text-[11px] text-slate-500 hover:text-slate-300">
                  取消全选
                </button>
              </div>
            </div>
            <div className="max-h-44 overflow-y-auto rounded-lg border border-[#333] bg-[#111] p-2 space-y-1 text-xs">
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
                        className="text-slate-500 p-0.5"
                      >
                        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                      <input
                        type="checkbox"
                        checked={volChecked}
                        onChange={(e) => toggleVolumeAll(vol, e.target.checked)}
                        className="rounded border-[#444]"
                      />
                      <span className="text-slate-300 font-medium truncate">{vol.title}</span>
                    </div>
                    {expanded &&
                      chs.map((ch) => (
                        <label
                          key={ch.id}
                          className="flex items-center gap-2 pl-8 py-0.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(ch.id)}
                            onChange={(e) => toggleChapter(ch.id, e.target.checked)}
                            className="rounded border-[#444]"
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

        <div className="h-14 border-t border-[#2a2a2a] bg-[#141414] flex items-center justify-end px-5 gap-3 shrink-0">
          <button type="button" onClick={closeModal} className="px-4 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition">
            取消
          </button>
          <button
            type="button"
            onClick={() => void runExport()}
            disabled={busy || !currentBookId}
            className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded flex items-center gap-1 transition"
          >
            <Download size={14} /> {busy ? '导出中...' : '选择路径并导出'}
          </button>
        </div>
      </div>
    </div>
  )
}
