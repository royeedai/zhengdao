import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'
import { useBookStore } from '@/stores/book-store'
import { useConfigStore } from '@/stores/config-store'
import { useSettingsStore } from '@/stores/settings-store'
import type { Chapter, DailyStats, Foreshadowing } from '@/types'
import { resolveProjectDailyGoal } from '@/utils/daily-goal'

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
    <svg width={w} height={h} className="text-[var(--accent-secondary)]" aria-hidden>
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
  const config = useConfigStore((s) => s.config)
  const systemDailyGoal = useSettingsStore((s) => s.systemDailyGoal)
  const dailyGoal = resolveProjectDailyGoal(config, systemDailyGoal)

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
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-[var(--border-primary)] bg-[var(--surface-elevated)] shadow-2xl my-auto">
        <div className="flex h-12 items-center justify-between border-b border-[var(--border-primary)] bg-[var(--bg-primary)] px-5 shrink-0">
          <span className="text-sm font-bold text-[var(--accent-secondary)]">书籍总览</span>
          <button
            type="button"
            onClick={closeModal}
            className="text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 text-sm">
          <div className="text-center">
            <div className="text-xs text-[var(--text-muted)]">总字数</div>
            <div className="mt-1 text-4xl font-bold tabular-nums text-[var(--accent-secondary)]">
              {(stats?.total_words ?? 0).toLocaleString()}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3">
              <div className="text-[var(--text-muted)]">章节</div>
              <div className="text-lg font-mono text-[var(--text-primary)]">{stats?.total_chapters ?? '—'}</div>
            </div>
            <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3">
              <div className="text-[var(--text-muted)]">分卷</div>
              <div className="text-lg font-mono text-[var(--text-primary)]">{volumeCount}</div>
            </div>
            <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3">
              <div className="text-[var(--text-muted)]">角色</div>
              <div className="text-lg font-mono text-[var(--text-primary)]">{stats?.total_characters ?? '—'}</div>
            </div>
            <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3">
              <div className="text-[var(--text-muted)]">剧情节点</div>
              <div className="text-lg font-mono text-[var(--text-primary)]">{plotCount}</div>
            </div>
            <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3">
              <div className="text-[var(--text-muted)]">伏笔（未收尾）</div>
              <div className="text-lg font-mono text-[var(--warning-primary)]">{foreshadowActive}</div>
            </div>
            <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3">
              <div className="text-[var(--text-muted)]">伏笔（已填）</div>
              <div className="text-lg font-mono text-[var(--success-primary)]">{foreshadowResolved}</div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs text-[var(--text-muted)]">近 14 日字数起伏</div>
              <Sparkline values={dailySeries.length ? dailySeries : [0]} />
            </div>
            <div className="text-right text-xs text-[var(--text-secondary)]">
              <div>本书《{title}》</div>
              <div className="mt-1">上次更新 {updatedAt}</div>
              <div className="mt-1">连续打卡 {streak} 天</div>
            </div>
          </div>

          <div>
            <div className="mb-1 flex justify-between text-xs text-[var(--text-muted)]">
              <span>今日进度</span>
              <span className="font-mono text-[var(--accent-secondary)]">
                {todayWords.toLocaleString()} / {dailyGoal.toLocaleString()}（{progressPct}%）
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full border border-[var(--border-primary)] bg-[var(--bg-tertiary)]">
              <div
                className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">最近编辑章节</div>
            <ul className="space-y-1.5 text-xs">
              {recent.map((ch) => (
                <li
                  key={ch.id}
                  className="flex justify-between gap-2 rounded border border-[var(--border-primary)] bg-[var(--bg-primary)] px-2 py-1.5"
                >
                  <span className="truncate text-[var(--text-primary)]">{ch.title}</span>
                  <span className="shrink-0 text-[var(--text-muted)]">{ch.updated_at?.slice(5, 16).replace('T', ' ')}</span>
                </li>
              ))}
              {recent.length === 0 && <li className="text-[var(--text-muted)]">暂无章节</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
