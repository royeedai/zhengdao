import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'
import { useBookStore } from '@/stores/book-store'
import type { DailyStats } from '@/types'
import { ACHIEVEMENTS } from '@/utils/achievements'

type TabId = 'day' | 'week' | 'month' | 'year'

function utcDayKey(d: Date): string {
  return d.toISOString().split('T')[0]
}

function parseSqliteMs(t: string): number {
  const normalized = t.includes('T') ? t : t.replace(' ', 'T')
  const ms = Date.parse(normalized)
  return Number.isFinite(ms) ? ms : Date.now()
}

interface SessionRow {
  id: number
  started_at: string
  ended_at: string | null
  word_count: number
}

function sessionDurationMs(s: SessionRow): number {
  const start = parseSqliteMs(s.started_at)
  const end = s.ended_at ? parseSqliteMs(s.ended_at) : Date.now()
  return Math.max(0, end - start)
}

export default function StatsModal() {
  const closeModal = useUIStore((s) => s.closeModal)
  const bookId = useBookStore((s) => s.currentBookId)
  const [tab, setTab] = useState<TabId>('day')
  const [rangeRows, setRangeRows] = useState<DailyStats[]>([])
  const [sessionsToday, setSessionsToday] = useState<SessionRow[]>([])
  const [achievementRows, setAchievementRows] = useState<
    { type: string; label: string; unlocked_at?: string }[]
  >([])

  useEffect(() => {
    if (!bookId) return
    let cancelled = false

    const load = async () => {
      const end = new Date()
      const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()))
      start.setUTCDate(start.getUTCDate() - 400)
      const from = utcDayKey(start)
      const to = utcDayKey(end)
      const rows = (await window.api.getStatsRange(bookId, from, to)) as DailyStats[]
      const sess = (await window.api.getSessionsToday(bookId)) as SessionRow[]
      const ach = (await window.api.getAchievements(bookId)) as {
        type: string
        label: string
        unlocked_at: string
      }[]
      if (cancelled) return
      setRangeRows(rows)
      setSessionsToday(sess)
      setAchievementRows(ach)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [bookId])

  const todayKey = utcDayKey(new Date())
  const byDate = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of rangeRows) {
      m.set(r.date, r.word_count)
    }
    return m
  }, [rangeRows])

  const todayWords = byDate.get(todayKey) ?? 0

  const todayMs = useMemo(() => sessionsToday.reduce((s, x) => s + sessionDurationMs(x), 0), [sessionsToday])
  const todayHours = todayMs / 3_600_000
  const wph =
    todayHours >= 0.02 ? Math.round(todayWords / todayHours) : todayWords > 0 ? todayWords : 0

  const weekDays = useMemo(() => {
    const out: { date: string; count: number }[] = []
    const end = new Date()
    const base = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()))
    for (let i = 6; i >= 0; i--) {
      const d = new Date(base)
      d.setUTCDate(d.getUTCDate() - i)
      const key = utcDayKey(d)
      out.push({ date: key, count: byDate.get(key) ?? 0 })
    }
    return out
  }, [byDate])

  const weekMax = Math.max(1, ...weekDays.map((d) => d.count))

  const heatmap = useMemo(() => {
    const end = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()))
    const days: { date: string; count: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(end)
      d.setUTCDate(d.getUTCDate() - i)
      const key = utcDayKey(d)
      days.push({ date: key, count: byDate.get(key) ?? 0 })
    }
    const first = new Date(days[0].date + 'T00:00:00Z')
    const padBefore = (first.getUTCDay() + 6) % 7
    const cells: ({ date: string; count: number } | null)[] = [...Array(padBefore).fill(null)]
    for (const x of days) cells.push(x)
    const padAfter = (7 - (cells.length % 7)) % 7
    for (let i = 0; i < padAfter; i++) cells.push(null)
    const heatMax = Math.max(1, ...days.map((d) => d.count))
    return { cells, heatMax, numCols: cells.length / 7 }
  }, [byDate])

  const yearMonths = useMemo(() => {
    const now = new Date()
    const labels: { ym: string; short: string; total: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
      const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
      labels.push({ ym, short: `${d.getUTCMonth() + 1}月`, total: 0 })
    }
    for (const r of rangeRows) {
      const ym = r.date.slice(0, 7)
      const slot = labels.find((l) => l.ym === ym)
      if (slot) slot.total += r.word_count
    }
    const mx = Math.max(1, ...labels.map((l) => l.total))
    return { labels, mx }
  }, [rangeRows])

  const unlockedMap = useMemo(() => new Map(achievementRows.map((a) => [a.type, a])), [achievementRows])

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 text-[var(--text-primary)] backdrop-blur-sm animate-fade-in">
      <div className="flex max-h-[78vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-[var(--border-primary)] bg-[var(--surface-elevated)] shadow-2xl">
        <header className="grid grid-cols-[40px_1fr_40px] items-center border-b border-[var(--border-primary)] bg-[var(--bg-primary)] px-4 py-3 shrink-0">
          <div className="h-9 w-9" aria-hidden />
          <h2 className="text-center text-base font-bold tracking-wide text-[var(--accent-secondary)]">写作数据中心</h2>
          <button
            type="button"
            onClick={closeModal}
            className="justify-self-end rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            aria-label="关闭"
            title="关闭"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex gap-2 border-b border-[var(--border-primary)] bg-[var(--surface-elevated)] px-4 py-3 shrink-0">
          {(
            [
              ['day', '日'],
              ['week', '周'],
              ['month', '月'],
              ['year', '年']
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                tab === id
                  ? 'border-[var(--accent-border)] bg-[var(--accent-surface)] text-[var(--accent-secondary)]'
                  : 'border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:border-[var(--accent-border)] hover:text-[var(--text-primary)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto bg-[var(--surface-elevated)] px-5 py-5">
          {tab === 'day' && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-4">
                <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">今日字数</div>
                <div className="mt-2 text-3xl font-bold tabular-nums text-[var(--accent-secondary)]">
                  {todayWords.toLocaleString()}
                </div>
              </div>
              <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-4">
                <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">今日写作时长</div>
                <div className="mt-2 text-3xl font-bold tabular-nums text-[var(--text-primary)]">
                  {todayMs >= 3600000
                    ? `${Math.floor(todayMs / 3600000)}h ${Math.round((todayMs % 3600000) / 60000)}m`
                    : `${Math.max(1, Math.round(todayMs / 60000))}m`}
                </div>
              </div>
              <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-4">
                <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">时速（字/小时）</div>
                <div className="mt-2 text-3xl font-bold tabular-nums text-[var(--text-primary)]">{wph.toLocaleString()}</div>
              </div>
            </div>
          )}

          {tab === 'week' && (
            <div>
              <div className="mb-4 text-sm text-[var(--text-secondary)]">最近 7 日字数</div>
              <div className="flex h-40 items-end justify-between gap-2 px-2">
                {weekDays.map((d) => (
                  <div key={d.date} className="flex h-full min-w-0 flex-1 flex-col items-center gap-2">
                    <div className="flex min-h-0 w-full flex-1 flex-col justify-end">
                      <div
                        className="min-h-[4px] w-full rounded-t-md transition-all"
                        title={`${d.date} · ${d.count.toLocaleString()} 字`}
                        style={{
                          height: `${Math.max(4, (d.count / weekMax) * 100)}%`,
                          background: 'linear-gradient(0deg, var(--accent-primary), var(--accent-secondary))'
                        }}
                      />
                    </div>
                    <span className="w-full truncate text-center text-[10px] text-[var(--text-muted)]">{d.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'month' && (
            <div>
              <div className="mb-4 text-sm text-[var(--text-secondary)]">最近 30 日热力（UTC 日历）</div>
              <div
                className="inline-grid gap-1"
                style={{
                  gridTemplateRows: 'repeat(7, 12px)',
                  gridAutoFlow: 'column',
                  gridAutoColumns: '12px'
                }}
              >
                {heatmap.cells.map((cell, idx) => {
                  if (!cell) {
                    return (
                      <div key={`e-${idx}`} className="rounded-sm bg-[var(--bg-tertiary)]" />
                    )
                  }
                  const intensity = cell.count === 0 ? 0 : Math.round((0.2 + (cell.count / heatmap.heatMax) * 0.8) * 85)
                  return (
                    <div
                      key={cell.date}
                      className="rounded-sm"
                      style={{
                        background:
                          cell.count === 0
                            ? 'var(--bg-tertiary)'
                            : `color-mix(in srgb, var(--accent-primary) ${intensity}%, var(--bg-tertiary))`
                      }}
                      title={`${cell.date} · ${cell.count.toLocaleString()} 字`}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {tab === 'year' && (
            <div>
              <div className="mb-4 text-sm text-[var(--text-secondary)]">过去 12 个月每月字数</div>
              <div className="flex h-44 items-end justify-between gap-2 px-1">
                {yearMonths.labels.map((m) => (
                  <div key={m.ym} className="flex h-full min-w-0 flex-1 flex-col items-center gap-2">
                    <div className="flex min-h-0 w-full flex-1 flex-col justify-end">
                      <div
                        className="min-h-[4px] w-full rounded-t-md"
                        style={{
                          height: `${Math.max(4, (m.total / yearMonths.mx) * 100)}%`,
                          background: 'linear-gradient(0deg, var(--accent-primary), var(--accent-secondary))'
                        }}
                        title={`${m.ym} · ${m.total.toLocaleString()} 字`}
                      />
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)]">{m.short}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="mb-4 text-sm font-semibold text-[var(--text-primary)]">成就徽章</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {ACHIEVEMENTS.map((def) => {
                const row = unlockedMap.get(def.type)
                const unlocked = Boolean(row)
                return (
                  <div
                    key={def.type}
                    className={`rounded-xl border p-3 text-center ${
                      unlocked
                        ? 'border-[var(--accent-border)] bg-[var(--accent-surface)]'
                        : 'border-[var(--border-primary)] bg-[var(--bg-primary)] opacity-50'
                    }`}
                    title={def.description}
                  >
                    <div className="text-2xl">{def.icon}</div>
                    <div className="mt-1 text-xs font-bold text-[var(--text-primary)]">{def.label}</div>
                    {row?.unlocked_at && (
                      <div className="mt-1 text-[10px] text-[var(--text-muted)]">{row.unlocked_at.slice(0, 10)}</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
