import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Activity, Plus, Trash2, BookPlus, Sparkles, Loader2, Check, X as XIcon } from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'
import { useBookStore } from '@/stores/book-store'
import { usePlotStore } from '@/stores/plot-store'
import { useCharacterStore } from '@/stores/character-store'
import type { PlotNode } from '@/types'
import PoisonWarning from './PoisonWarning'
import { useChapterStore } from '@/stores/chapter-store'
import { useConfigStore } from '@/stores/config-store'
import { useToastStore } from '@/stores/toast-store'
import { aiComplete } from '@/utils/ai'

function escapePlainToHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function descriptionToChapterHtml(description: string): string {
  const d = description.trim()
  if (!d) return '<p></p>'
  if (d.includes('<')) return d
  return `<p>${escapePlainToHtml(d)}</p>`
}

type ParsedPlotSuggestion = {
  chapter_number: number
  title: string
  score: number
  description: string
}

function parsePlotSuggestions(text: string): ParsedPlotSuggestion[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const out: ParsedPlotSuggestion[] = []
  for (const line of lines) {
    const parts = line.split('|').map((p) => p.trim())
    if (parts.length < 4) continue
    const chapter_number = parseInt(parts[0], 10)
    const score = parseInt(parts[2], 10)
    if (Number.isNaN(chapter_number) || Number.isNaN(score)) continue
    out.push({
      chapter_number,
      title: parts[1],
      score: Math.max(-5, Math.min(5, score)),
      description: parts.slice(3).join('|')
    })
  }
  return out
}

const CHAPTER_PX = 15
const INVISIBLE_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
const NEW_PLOTLINE_COLORS = ['#10b981', '#3b82f6', '#a855f7', '#f59e0b', '#ec4899', '#14b8a6']

export default function BottomPanel() {
  const { bottomPanelOpen, bottomPanelHeight, setBottomPanelHeight, pushModal } = useUIStore()
  const bookId = useBookStore((s) => s.currentBookId)
  const plotNodes = usePlotStore((s) => s.plotNodes)
  const plotlines = usePlotStore((s) => s.plotlines)
  const plotNodeCharacterIds = usePlotStore((s) => s.plotNodeCharacterIds)
  const createPlotline = usePlotStore((s) => s.createPlotline)
  const updatePlotline = usePlotStore((s) => s.updatePlotline)
  const deletePlotline = usePlotStore((s) => s.deletePlotline)
  const updatePlotNode = usePlotStore((s) => s.updatePlotNode)
  const createPlotNode = usePlotStore((s) => s.createPlotNode)
  const checkPoisonWarning = usePlotStore((s) => s.checkPoisonWarning)
  const characters = useCharacterStore((s) => s.characters)
  const openModal = useUIStore((s) => s.openModal)
  const volumes = useChapterStore((s) => s.volumes)
  const createChapter = useChapterStore((s) => s.createChapter)
  const loadVolumes = useChapterStore((s) => s.loadVolumes)

  const scrollRef = useRef<HTMLDivElement>(null)
  const ignoreClickRef = useRef(false)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)
  const resizeStateRef = useRef<{ startY: number; startHeight: number } | null>(null)

  const [hiddenPlotlineIds, setHiddenPlotlineIds] = useState<Set<number>>(new Set())
  const [managePlotlinesOpen, setManagePlotlinesOpen] = useState(false)

  const [selectForChapterGen, setSelectForChapterGen] = useState(false)
  const [selectedNodes, setSelectedNodes] = useState<Set<number>>(new Set())
  const [generatingChapters, setGeneratingChapters] = useState(false)
  const [aiFillLoading, setAiFillLoading] = useState(false)
  const [aiFillPanelOpen, setAiFillPanelOpen] = useState(false)
  const [aiFillError, setAiFillError] = useState<string | null>(null)
  const [aiFillSuggestions, setAiFillSuggestions] = useState<ParsedPlotSuggestion[]>([])
  const [aiFillGap, setAiFillGap] = useState<{ before: PlotNode; after: PlotNode } | null>(null)

  const [poisonWarning, setPoisonWarning] = useState<{
    show: boolean
    startCh: number
    endCh: number
  }>({ show: false, startCh: 0, endCh: 0 })

  useEffect(() => {
    const result = checkPoisonWarning()
    if (result.triggered) {
      setPoisonWarning({
        show: true,
        startCh: result.startCh,
        endCh: result.endCh
      })
    } else {
      setPoisonWarning((prev) => ({ ...prev, show: false }))
    }
  }, [plotNodes, checkPoisonWarning])

  const togglePlotlineVisibility = useCallback((id: number) => {
    setHiddenPlotlineIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const visibleNodes = plotNodes.filter((n) => {
    if (!n.plotline_id) return true
    return !hiddenPlotlineIds.has(n.plotline_id)
  })

  const plotlineMap = Object.fromEntries(plotlines.map((p) => [p.id, p]))

  const generateEKGPath = () => {
    if (visibleNodes.length === 0) return ''
    const sorted = [...visibleNodes].sort((a, b) => a.chapter_number - b.chapter_number)
    let path = 'M 0 100 '
    sorted.forEach((node) => {
      const x = node.chapter_number * CHAPTER_PX
      const y = 100 - node.score * CHAPTER_PX
      path += `L ${x} ${y} `
    })
    const last = sorted[sorted.length - 1]
    path += `L ${(last.chapter_number + 15) * CHAPTER_PX} 100`
    return path
  }

  const usePlotlineColors = plotlines.length > 0

  const nodeStyle = (node: PlotNode) => {
    const isHigh = node.score > 0
    const isLow = node.score < 0
    const pl = node.plotline_id ? plotlineMap[node.plotline_id] : undefined
    const lineColor = usePlotlineColors && pl ? pl.color : null

    if (lineColor) {
      return {
        borderClass: 'border',
        borderStyle: { borderColor: lineColor } as CSSProperties,
        scoreClass: isHigh ? 'text-emerald-400' : isLow ? 'text-red-400' : 'text-yellow-400',
        dotStyle: { backgroundColor: lineColor } as CSSProperties
      }
    }
    return {
      borderClass: isHigh
        ? 'border-emerald-900/50 hover:border-emerald-500/50'
        : isLow
          ? 'border-red-900/50 hover:border-red-500/50'
          : 'border-yellow-900/50 hover:border-yellow-500/50',
      borderStyle: {} as CSSProperties,
      scoreClass: isHigh ? 'text-emerald-400' : isLow ? 'text-red-400' : 'text-yellow-400',
      dotStyle: {} as CSSProperties,
      dotClass: isHigh ? 'bg-emerald-500' : isLow ? 'bg-red-500' : 'bg-yellow-500'
    }
  }

  const handleNewPlotline = () => {
    if (!bookId) return
    const i = plotlines.length % NEW_PLOTLINE_COLORS.length
    void createPlotline(bookId, `支线 ${plotlines.length + 1}`, NEW_PLOTLINE_COLORS[i])
  }

  const onDragStartPlot = (e: React.DragEvent) => {
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    e.dataTransfer.effectAllowed = 'move'
    const img = new Image()
    img.src = INVISIBLE_GIF
    e.dataTransfer.setDragImage(img, 0, 0)
  }

  const onDragEndPlot = (e: React.DragEvent, node: PlotNode) => {
    if (e.clientX === 0 && e.clientY === 0) {
      dragStartRef.current = null
      return
    }
    const start = dragStartRef.current
    dragStartRef.current = null
    const moved = start !== null && (Math.abs(e.clientX - start.x) > 4 || Math.abs(e.clientY - start.y) > 4)
    if (moved) ignoreClickRef.current = true

    const scrollEl = scrollRef.current
    if (!scrollEl || !bookId) {
      window.setTimeout(() => {
        ignoreClickRef.current = false
      }, 80)
      return
    }
    const rect = scrollEl.getBoundingClientRect()
    const x = e.clientX - rect.left + scrollEl.scrollLeft
    const newChapter = Math.max(1, Math.round(x / CHAPTER_PX))
    if (newChapter !== node.chapter_number) {
      void updatePlotNode(node.id, { chapter_number: newChapter })
    }
    window.setTimeout(() => {
      ignoreClickRef.current = false
    }, 80)
  }

  const buildNodeChapterContent = async (description: string) => {
    const base = descriptionToChapterHtml(description)
    const config = useConfigStore.getState().config
    if (!config?.ai_api_key || !config.ai_api_endpoint) return base
    const res = await aiComplete(
      {
        ai_provider: config.ai_provider,
        ai_api_key: config.ai_api_key,
        ai_api_endpoint: config.ai_api_endpoint,
        ai_model: config.ai_model || ''
      },
      '将下列剧情梗概扩写为可放在章首的 HTML 片段（仅使用 <p> 标签，2～5 段，可紧接在梗概之后作为扩写）：',
      description.trim() || '（暂无梗概）'
    )
    if (res.error || !res.content.trim()) return base
    const expanded = res.content.trim()
    if (description.trim()) return `${base}\n${expanded}`
    return expanded || base
  }

  const generateChaptersFromNodes = async () => {
    if (!bookId) return
    const sorted = plotNodes
      .filter((n) => selectedNodes.has(n.id))
      .sort((a, b) => a.chapter_number - b.chapter_number)
    if (sorted.length === 0) {
      useToastStore.getState().addToast('warning', '请先勾选剧情节点')
      return
    }
    const volumeId = volumes[volumes.length - 1]?.id
    if (!volumeId) {
      useToastStore.getState().addToast('warning', '请先创建卷')
      return
    }
    setGeneratingChapters(true)
    try {
      for (const node of sorted) {
        const title = `第${node.chapter_number}章：${node.title}`
        const html = await buildNodeChapterContent(node.description || '')
        await createChapter(volumeId, title, html)
      }
      await loadVolumes(bookId)
      useToastStore.getState().addToast('success', `已从 ${sorted.length} 个节点生成章节大纲`)
      setSelectedNodes(new Set())
      setSelectForChapterGen(false)
    } catch (e) {
      useToastStore.getState().addToast('error', e instanceof Error ? e.message : '生成失败')
    } finally {
      setGeneratingChapters(false)
    }
  }

  const aiAutoFillPlot = async () => {
    const sortedNodes = [...plotNodes].sort((a, b) => a.chapter_number - b.chapter_number)
    if (sortedNodes.length < 2) {
      useToastStore.getState().addToast('warning', '至少需要两个剧情节点')
      return
    }
    let maxGap = 0
    let gapStart = 0
    let gapEnd = 1
    for (let i = 1; i < sortedNodes.length; i++) {
      const gap = sortedNodes[i].chapter_number - sortedNodes[i - 1].chapter_number
      if (gap > maxGap) {
        maxGap = gap
        gapStart = i - 1
        gapEnd = i
      }
    }
    if (maxGap <= 1) {
      useToastStore.getState().addToast(
        'warning',
        '相邻剧情节点之间没有可用的章号空隙，请先拉开章号间距'
      )
      return
    }
    const configEarly = useConfigStore.getState().config
    if (!configEarly?.ai_api_key || !configEarly.ai_api_endpoint) {
      useToastStore.getState().addToast('warning', '请先配置 AI')
      return
    }
    const before = sortedNodes[gapStart]
    const after = sortedNodes[gapEnd]
    setAiFillGap({ before, after })
    const config = configEarly
    setAiFillLoading(true)
    setAiFillError(null)
    setAiFillSuggestions([])
    setAiFillPanelOpen(true)
    try {
      const cfg = {
        ai_provider: config.ai_provider,
        ai_api_key: config.ai_api_key,
        ai_api_endpoint: config.ai_api_endpoint,
        ai_model: config.ai_model || ''
      }
      const result = await aiComplete(
        cfg,
        `在剧情"${before.title}"(情绪${before.score})和"${after.title}"(情绪${after.score})之间，建议插入2-3个过渡剧情节点。每个节点格式为：章节号|标题|情绪分(-5到5)|简述。章节号必须在 ${before.chapter_number} 与 ${after.chapter_number} 之间的整数。用换行分隔。`,
        `已有节点：${sortedNodes.map((n) => `Ch${n.chapter_number}:${n.title}(${n.score})`).join(', ')}`
      )
      if (result.error) {
        setAiFillError(result.error)
        return
      }
      const parsed = parsePlotSuggestions(result.content).filter(
        (s) =>
          s.chapter_number > before.chapter_number &&
          s.chapter_number < after.chapter_number
      )
      if (parsed.length === 0) {
        setAiFillError('未能解析 AI 返回的节点，请重试或检查模型输出格式')
        return
      }
      setAiFillSuggestions(parsed.sort((a, b) => a.chapter_number - b.chapter_number))
    } catch (e) {
      setAiFillError(e instanceof Error ? e.message : '请求失败')
    } finally {
      setAiFillLoading(false)
    }
  }

  const acceptAiSuggestions = async () => {
    if (!bookId || !aiFillGap || aiFillSuggestions.length === 0) return
    try {
      for (const s of aiFillSuggestions) {
        await createPlotNode({
          book_id: bookId,
          chapter_number: s.chapter_number,
          title: s.title,
          score: s.score,
          description: s.description,
          node_type: 'main'
        })
      }
      useToastStore.getState().addToast('success', `已插入 ${aiFillSuggestions.length} 个节点`)
      setAiFillPanelOpen(false)
      setAiFillSuggestions([])
      setAiFillGap(null)
    } catch (e) {
      useToastStore.getState().addToast('error', e instanceof Error ? e.message : '写入失败')
    }
  }

  const handleNodeCardClick = (node: PlotNode) => {
    if (ignoreClickRef.current) return
    if (selectForChapterGen) {
      setSelectedNodes((prev) => {
        const next = new Set(prev)
        if (next.has(node.id)) next.delete(node.id)
        else next.add(node.id)
        return next
      })
      return
    }
    openModal('plotNode', { ...node })
  }

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      const resizeState = resizeStateRef.current
      if (!resizeState) return
      const nextHeight = resizeState.startHeight + (resizeState.startY - event.clientY)
      setBottomPanelHeight(nextHeight)
    }

    const handleUp = () => {
      resizeStateRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [setBottomPanelHeight])

  return (
    <div
      className={`border-t border-[var(--border-primary)] bg-[var(--bg-primary)] shrink-0 flex flex-col transition-all duration-300 ease-in-out ${
        bottomPanelOpen ? 'opacity-100 z-20' : 'h-0 opacity-0 overflow-hidden border-t-0 z-0'
      }`}
      style={bottomPanelOpen ? { height: `${bottomPanelHeight}px` } : undefined}
    >
      <button
        type="button"
        aria-label="调整沙盘高度"
        title="拖拽调整沙盘高度"
        onMouseDown={(event) => {
          resizeStateRef.current = { startY: event.clientY, startHeight: bottomPanelHeight }
          document.body.style.cursor = 'ns-resize'
          document.body.style.userSelect = 'none'
        }}
        className="h-4 flex items-center justify-center border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] cursor-ns-resize shrink-0"
      >
        <span className="h-1 w-14 rounded-full bg-[var(--border-secondary)]" />
      </button>
      <div className="h-10 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] flex items-center px-6 justify-between shrink-0 shadow-sm">
        <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm tracking-wide">
          <Activity size={16} />
          <span>创世沙盘 &amp; 爽点心电图</span>
        </div>
        <div className="flex space-x-3 items-center">
          <div className="flex items-center text-[10px] text-[var(--text-secondary)] mr-4 space-x-3">
            <span className="flex items-center">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1" />
              爽点区 (+1~+5)
            </span>
            <span className="flex items-center">
              <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full mr-1" />
              平稳区 (0)
            </span>
            <span className="flex items-center">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1" />
              毒点区 (-1~-5)
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectForChapterGen((v) => {
                const next = !v
                if (!next) setSelectedNodes(new Set())
                return next
              })
            }}
            className={`px-2 py-1 rounded flex items-center text-[10px] font-bold transition border ${
              selectForChapterGen
                ? 'bg-emerald-900/60 border-emerald-600 text-emerald-200'
                : 'bg-slate-700 border-transparent hover:bg-emerald-600 text-white'
            }`}
            title="从剧情节点批量生成章节"
          >
            <BookPlus size={12} className="mr-1 shrink-0" /> 生成章节
          </button>
          {selectForChapterGen && (
            <button
              type="button"
              disabled={generatingChapters}
              onClick={() => void generateChaptersFromNodes()}
              className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white px-2 py-1 rounded flex items-center text-[10px] font-bold transition"
            >
              {generatingChapters ? (
                <Loader2 size={12} className="mr-1 animate-spin shrink-0" />
              ) : (
                <Check size={12} className="mr-1 shrink-0" />
              )}
              从选中节点生成大纲
            </button>
          )}
          <button
            type="button"
            disabled={aiFillLoading}
            onClick={() => void aiAutoFillPlot()}
            className="bg-violet-800 hover:bg-violet-700 disabled:opacity-40 text-white px-2 py-1 rounded flex items-center text-[10px] font-bold transition"
            title="让 AI 补齐过渡剧情节点"
          >
            {aiFillLoading ? (
              <Loader2 size={12} className="mr-1 animate-spin shrink-0" />
            ) : (
              <Sparkles size={12} className="mr-1 shrink-0" />
            )}
            AI 补全
          </button>
          <button
            onClick={() => openModal('plotNode', { isNew: true })}
            className="bg-slate-700 hover:bg-emerald-600 text-white px-2 py-1 rounded flex items-center text-[10px] font-bold transition"
            title="新增剧情节点"
          >
            <Plus size={12} className="mr-1" /> 补全新节点
          </button>
        </div>
      </div>

      <div className="px-4 py-2 border-b border-[var(--border-primary)] bg-[var(--bg-primary)] flex flex-wrap items-center gap-2 shrink-0">
        <span className="text-[10px] text-[var(--text-muted)] uppercase shrink-0">剧情线</span>
        {plotlines.map((pl) => {
          const hidden = hiddenPlotlineIds.has(pl.id)
          return (
            <button
              key={pl.id}
              type="button"
              onClick={() => togglePlotlineVisibility(pl.id)}
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border transition ${
                hidden ? 'opacity-40 border-[var(--border-primary)] text-[var(--text-muted)]' : 'border-transparent text-[var(--text-primary)]'
              }`}
              style={{ backgroundColor: `${pl.color}28`, borderColor: hidden ? undefined : pl.color }}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: pl.color }} />
              {pl.name}
            </button>
          )
        })}
        <button
          type="button"
          onClick={handleNewPlotline}
          disabled={!bookId}
          className="text-[10px] px-2 py-0.5 rounded border border-dashed border-[var(--border-secondary)] text-[var(--text-secondary)] hover:text-emerald-400 hover:border-emerald-600/50 transition disabled:opacity-40"
        >
          + 新建线
        </button>
        <button
          type="button"
          onClick={() => setManagePlotlinesOpen((v) => !v)}
          className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:brightness-110 transition ml-auto"
        >
          管理
        </button>
      </div>

      {managePlotlinesOpen && (
        <div className="px-4 py-3 border-b border-[var(--border-primary)] bg-[var(--bg-primary)] max-h-[120px] overflow-y-auto shrink-0 space-y-2">
          {plotlines.length === 0 ? (
            <p className="text-[10px] text-[var(--text-muted)]">暂无剧情线，点击「新建线」添加。</p>
          ) : (
            plotlines.map((pl) => (
              <PlotlineManageRow
                key={pl.id}
                plotline={pl}
                onUpdate={(name, color) => void updatePlotline(pl.id, name, color)}
                onDelete={() =>
                  pushModal('confirm', {
                    title: '删除剧情线',
                    message: `确定删除剧情线「${pl.name}」吗？该线上的节点仍会保留，但会失去所属剧情线。`,
                    onConfirm: async () => {
                      await deletePlotline(pl.id)
                    }
                  })}
              />
            ))
          )}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden relative bg-[var(--bg-primary)]">
        {plotNodes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">
            <button onClick={() => openModal('plotNode', { isNew: true })} className="hover:text-emerald-400 transition">
              点击 + 添加第一个剧情节点
            </button>
          </div>
        ) : (
          <div className="relative min-w-[1500px] h-full">
            <div className="absolute top-0 left-0 w-full h-full">
              {[...Array(15)].map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full border-l border-[var(--border-primary)] flex flex-col pointer-events-none"
                  style={{ left: `${(i + 1) * 150}px` }}
                >
                  <span className="text-[10px] text-[var(--text-muted)] font-mono mt-1 ml-1">Ch {(i + 1) * 10}</span>
                </div>
              ))}
              <div className="absolute top-[120px] w-full border-t border-[var(--border-primary)] border-dashed pointer-events-none" />
            </div>
            <svg className="absolute top-4 left-0 w-full h-[240px] pointer-events-none z-0 overflow-visible">
              <path
                d={generateEKGPath()}
                fill="none"
                stroke="url(#ekg-grad)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]"
              />
              <defs>
                <linearGradient id="ekg-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="50%" stopColor="#eab308" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>
            </svg>
            {plotNodes.map((node) => {
              const hidden = Boolean(node.plotline_id && hiddenPlotlineIds.has(node.plotline_id))
              if (hidden) return null

              const xPos = node.chapter_number * CHAPTER_PX
              const yPos = 120 - node.score * CHAPTER_PX
              const isHigh = node.score > 0
              const st = nodeStyle(node)
              const dotRing =
                'dotClass' in st && st.dotClass
                  ? st.dotClass
                  : ''
              const dotPos =
                isHigh ? '-bottom-1.5' : node.score < 0 ? '-top-1.5' : 'top-1/2 -mt-1.5'
              const assocIds = plotNodeCharacterIds[node.id] ?? []
              const assocChars = assocIds.map((id) => characters.find((c) => c.id === id)).filter(Boolean)

              return (
                <div
                  key={node.id}
                  draggable
                  onDragStart={onDragStartPlot}
                  onDragEnd={(e) => onDragEndPlot(e, node)}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleNodeCardClick(node)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleNodeCardClick(node)
                    }
                  }}
                  className={`group absolute w-36 p-2 rounded-lg border shadow-lg cursor-grab active:cursor-grabbing transition-all duration-200 z-10 hover:shadow-xl hover:-translate-y-0.5 bg-[var(--bg-secondary)] ${st.borderClass} ${
                    selectForChapterGen && selectedNodes.has(node.id) ? 'ring-2 ring-emerald-500/80' : ''
                  }`}
                  style={{ left: `${xPos - 72}px`, top: `${yPos - (isHigh ? 60 : 0)}px`, ...st.borderStyle }}
                >
                  {selectForChapterGen && (
                    <label
                      className="absolute -top-2 -left-2 z-20 w-5 h-5 flex items-center justify-center rounded bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedNodes.has(node.id)}
                        onChange={() => {
                          setSelectedNodes((prev) => {
                            const next = new Set(prev)
                            if (next.has(node.id)) next.delete(node.id)
                            else next.add(node.id)
                            return next
                          })
                        }}
                        className="accent-emerald-500 w-3.5 h-3.5"
                      />
                    </label>
                  )}
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] bg-[var(--bg-tertiary)] px-1 py-0.5 rounded text-[var(--text-primary)] font-mono">
                      Ch {node.chapter_number}
                    </span>
                    <span className={`text-[10px] font-bold ${st.scoreClass}`}>
                      {node.score > 0 ? '+' + node.score : node.score}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-[var(--text-primary)] truncate mb-0.5">{node.title}</div>
                  {assocChars.length > 0 && (
                    <div className="flex items-center gap-0.5 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {assocChars.slice(0, 5).map((ch) => (
                        <span
                          key={ch!.id}
                          title={ch!.name}
                          className="w-5 h-5 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[8px] flex items-center justify-center text-[var(--text-primary)] font-medium shrink-0 overflow-hidden"
                        >
                          {ch!.name.slice(0, 1)}
                        </span>
                      ))}
                      {assocChars.length > 5 && (
                        <span className="text-[8px] text-[var(--text-muted)]">+{assocChars.length - 5}</span>
                      )}
                    </div>
                  )}
                  <div className="text-[9px] text-[var(--text-muted)] line-clamp-1">{node.description}</div>
                  <div
                    className={`absolute left-1/2 -ml-1.5 w-3 h-3 rounded-full border-2 border-[var(--bg-secondary)] ${dotRing} ${dotPos}`}
                    style={Object.keys(st.dotStyle).length ? st.dotStyle : undefined}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
      {aiFillPanelOpen && (
        <div className="absolute bottom-11 right-4 z-30 w-[min(360px,calc(100%-2rem))] rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-2xl overflow-hidden flex flex-col max-h-[240px]">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-primary)] bg-[var(--bg-primary)]">
            <span className="text-[11px] font-bold text-violet-300">AI 过渡节点建议</span>
            <button
              type="button"
              onClick={() => {
                setAiFillPanelOpen(false)
                setAiFillError(null)
                setAiFillSuggestions([])
              }}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5"
              aria-label="关闭"
            >
              <XIcon size={14} />
            </button>
          </div>
          <div className="p-3 overflow-y-auto text-[11px] space-y-2">
            {aiFillLoading && (
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <Loader2 size={14} className="animate-spin shrink-0" /> 请求中…
              </div>
            )}
            {aiFillError && <p className="text-red-400">{aiFillError}</p>}
            {!aiFillLoading &&
              aiFillSuggestions.map((s, idx) => (
                <div key={`${s.chapter_number}-${idx}`} className="rounded border border-[var(--border-primary)] bg-[var(--bg-primary)] p-2">
                  <div className="font-mono text-emerald-400/90 mb-0.5">
                    Ch{s.chapter_number} · {s.score > 0 ? `+${s.score}` : s.score}
                  </div>
                  <div className="text-[var(--text-primary)] font-medium">{s.title}</div>
                  <div className="text-[var(--text-muted)] mt-1 line-clamp-3">{s.description}</div>
                </div>
              ))}
          </div>
          {!aiFillLoading && aiFillSuggestions.length > 0 && (
            <div className="flex gap-2 px-3 py-2 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]">
              <button
                type="button"
                onClick={() => void acceptAiSuggestions()}
                className="flex-1 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition"
              >
                插入沙盘
              </button>
              <button
                type="button"
                onClick={() => {
                  setAiFillPanelOpen(false)
                  setAiFillSuggestions([])
                }}
                className="px-3 py-1.5 rounded bg-[var(--bg-tertiary)] hover:brightness-110 text-[var(--text-primary)] text-[11px] transition"
              >
                取消
              </button>
            </div>
          )}
        </div>
      )}

      {poisonWarning.show && (
        <PoisonWarning
          startCh={poisonWarning.startCh}
          endCh={poisonWarning.endCh}
          onClose={() => setPoisonWarning((p) => ({ ...p, show: false }))}
        />
      )}
    </div>
  )
}

function PlotlineManageRow({
  plotline,
  onUpdate,
  onDelete
}: {
  plotline: { id: number; name: string; color: string }
  onUpdate: (name: string, color: string) => void
  onDelete: () => void
}) {
  const [name, setName] = useState(plotline.name)
  const [color, setColor] = useState(plotline.color)

  useEffect(() => {
    setName(plotline.name)
    setColor(plotline.color)
  }, [plotline.name, plotline.color])

  return (
    <div className="flex items-center gap-2 text-[11px]">
      <input
        type="color"
        value={color}
        onChange={(e) => {
          const v = e.target.value
          setColor(v)
          onUpdate(name, v)
        }}
        className="w-7 h-6 rounded border border-[var(--border-primary)] cursor-pointer shrink-0 p-0 bg-transparent"
      />
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          if (name.trim() && name !== plotline.name) onUpdate(name.trim(), color)
        }}
        className="flex-1 min-w-0 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-2 py-1 text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
      />
      <button
        type="button"
        onClick={onDelete}
        title="删除剧情线"
        className="p-1 rounded text-[var(--text-muted)] hover:text-red-400 hover:bg-red-950/30 shrink-0"
        aria-label="删除剧情线"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
