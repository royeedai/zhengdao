import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'
import { useBookStore } from '@/stores/book-store'
import { useConfigStore } from '@/stores/config-store'
import type { Chapter, DailyStats, Foreshadowing } from '@/types'

type BookStatsRow = {
  total_words: number
  total_chapters: number
  total_characters: number
}

function utcDayKey(d: Date): string {
  return d.toISOString().split('T')[0]
}

function Sparkline({ values }: { values: number[] }) {
  const w = 220
  const h = 48
  const pad = 4
  const max = Math.max(1, ...values)
  const denom = Math.max(1, values.length - 1)
  const pts = values.map((v, i) => {
    const x = pad + (values.length <= 1 ? (w - pad * 2) / 2 : (i / denom) * (w - pad * 2))
    const y = h - pad - (v / max) * (h - pad * 2)
    return `${x},${y}`
  })
  const dPath = pts.length ? `M ${pts.join(' L ')}` : ''

  return (
    <svg width={w} height={h} className="text-emerald-500/90" aria-hidden>
      <path
        d={dPath}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function BookOverviewModal() {
  const closeModal = useUIStore((s) => s.closeModal)
  const bookId = useBookStore((s) => s.currentBookId)!
  const books = useBookStore((s) => s.books)
  const dailyGoal = useConfigStore((s) => s.config?.daily_goal ?? 6000)

  const [stats, setStats] = useState<BookStatsRow | null>(null)
  const [volumeCount, setVolumeCount] = useState(0)
  const [plotCount, setPlotCount] = useState(0)
  const [foreshadowActive, setForeshadowActive] = useState(0)
  const [foreshadowResolved, setForeshadowResolved] = useState(0)
  const [recent, setRecent] = useState<Chapter[]>([])
  const [dailySeries, setDailySeries] = useState<number[]>([])
  const [todayWords, setTodayWords] = useState(0)
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [
        bs,
        vols,
        plots,
        fs,
        chapters,
        tw,
        astr,
        range
      ] = await Promise.all([
        window.api.getBookStats(bookId),
        window.api.getVolumes(bookId),
        window.api.getPlotNodes(bookId),
        window.api.getForeshadowings(bookId),
        window.api.getRecentChapters(bookId, 5),
        window.api.getDailyStats(bookId, utcDayKey(new Date())),
        window.api.getAchievementStats(bookId),
        (async () => {
          const end = new Date()
          const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()))
          start.setUTCDate(start.getUTCDate() - 13)
          const from = utcDayKey(start)
          const to = utcDayKey(end)
          return window.api.getStatsRange(bookId, from, to) as Promise<DailyStats[]>
        })()
      ])
      if (cancelled) return
      setStats(bs as BookStatsRow)
      setVolumeCount((vols as unknown[]).length)
      setPlotCount((plots as unknown[]).length)
      const frows = fs as Foreshadowing[]
      setForeshadowActive(frows.filter((f) => f.status === 'pending' || f.status === 'warning').length)
      setForeshadowResolved(frows.filter((f) => f.status === 'resolved').length)
      setRecent(chapters as Chapter[])
      setTodayWords(((tw as { word_count?: number })?.word_count ?? 0) as number)
      setStreak((astr as { streak: number }).streak)
      const m = new Map(range.map((r) => [r.date, r.word_count]))
      const series: number[] = []
      for (let i = 13; i >= 0; i--) {
        const d = new Date()
        const u = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
        u.setUTCDate(u.getUTCDate() - i)
        series.push(m.get(utcDayKey(u)) ?? 0)
      }
      setDailySeries(series)
    })()
    return () => {
      cancelled = true
    }
  }, [bookId])

  const book = books.find((b) => b.id === bookId)
  const title = book?.title ?? ''
  const updatedAt = book?.updated_at?.slice(0, 19).replace('T', ' ') ?? '—'

  const progressPct = Math.min(100, Math.round(((todayWords || 0) / Math.max(1, dailyGoal)) * 100))

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-[#141414] border border-[#333] w-full max-w-xl rounded-xl shadow-2xl overflow-hidden flex flex-col my-auto">
        <div className="h-12 border-b border-[#2a2a2a] flex items-center justify-between px-5 shrink-0">
          <span className="text-emerald-400 font-bold text-sm">书籍总览</span>
          <button type="button" onClick={closeModal} className="text-slate-500 hover:text-slate-300 transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 text-sm">
          <div className="text-center">
            <div className="text-xs text-slate-500">总字数</div>
            <div className="text-4xl font-bold text-emerald-400 tabular-nums mt-1">
              {(stats?.total_words ?? 0).toLocaleString()}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] p-3">
              <div className="text-slate-500">章节</div>
              <div className="text-lg font-mono text-slate-100">{stats?.total_chapters ?? '—'}</div>
            </div>
            <div className="rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] p-3">
              <div className="text-slate-500">分卷</div>
              <div className="text-lg font-mono text-slate-100">{volumeCount}</div>
            </div>
            <div className="rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] p-3">
              <div className="text-slate-500">角色</div>
              <div className="text-lg font-mono text-slate-100">{stats?.total_characters ?? '—'}</div>
            </div>
            <div className="rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] p-3">
              <div className="text-slate-500">剧情节点</div>
              <div className="text-lg font-mono text-slate-100">{plotCount}</div>
            </div>
            <div className="rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] p-3">
              <div className="text-slate-500">伏笔（未收尾）</div>
              <div className="text-lg font-mono text-orange-300">{foreshadowActive}</div>
            </div>
            <div className="rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] p-3">
              <div className="text-slate-500">伏笔（已填）</div>
              <div className="text-lg font-mono text-emerald-300">{foreshadowResolved}</div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs text-slate-500">近 14 日字数起伏</div>
              <Sparkline values={dailySeries.length ? dailySeries : [0]} />
            </div>
            <div className="text-right text-xs text-slate-400">
              <div>本书《{title}》</div>
              <div className="mt-1">上次更新 {updatedAt}</div>
              <div className="mt-1">连续打卡 {streak} 天</div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>今日进度</span>
              <span className="text-emerald-400 font-mono">
                {todayWords.toLocaleString()} / {dailyGoal.toLocaleString()}（{progressPct}%）
              </span>
            </div>
            <div className="h-2 rounded-full bg-[#222] overflow-hidden border border-[#333]">
              <div
                className="h-full bg-gradient-to-r from-emerald-700 to-emerald-400"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-400 mb-2">最近编辑章节</div>
            <ul className="space-y-1.5 text-xs">
              {recent.map((ch) => (
                <li
                  key={ch.id}
                  className="flex justify-between gap-2 border border-[#2a2a2a] rounded px-2 py-1.5 bg-[#1a1a1a]"
                >
                  <span className="truncate text-slate-300">{ch.title}</span>
                  <span className="text-slate-500 shrink-0">{ch.updated_at?.slice(5, 16).replace('T', ' ')}</span>
                </li>
              ))}
              {recent.length === 0 && <li className="text-slate-500">暂无章节</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
