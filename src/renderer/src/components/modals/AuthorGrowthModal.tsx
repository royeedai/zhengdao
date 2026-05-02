import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  Clipboard,
  FileCheck2,
  Loader2,
  RefreshCw,
  Rocket,
  Send,
  Target,
  Trophy,
  X
} from 'lucide-react'
import { useBookStore } from '@/stores/book-store'
import { useChapterStore } from '@/stores/chapter-store'
import { useConfigStore } from '@/stores/config-store'
import { useForeshadowStore } from '@/stores/foreshadow-store'
import { useToastStore } from '@/stores/toast-store'
import { useUIStore } from '@/stores/ui-store'
import {
  SUBMISSION_GUIDE_PRESETS,
  buildGrowthShareText,
  buildGrowthSnapshotModel,
  buildSprintResultText,
  buildSubmissionChecklistText,
  buildSubmissionReadiness,
  type AuthorGrowthTab,
  type SubmissionReadinessStatus
} from '@/utils/author-growth'
import { getLocalDateKey } from '@/utils/daily-workbench'
import { getSensitiveWords } from '@/utils/sensitive-words'
import {
  buildPublishPackage,
  type PublishCheckChapter
} from '@/utils/publish-check'
import type { Chapter, ChapterMeta } from '@/types'

function isAuthorGrowthTab(value: unknown): value is AuthorGrowthTab {
  return value === 'sprint' || value === 'weekly' || value === 'submission'
}

function toPublishCheckChapter(chapter: Chapter | ChapterMeta, volumeTitle = ''): PublishCheckChapter {
  return {
    id: chapter.id,
    title: chapter.title,
    content: 'content' in chapter ? chapter.content ?? null : null,
    word_count: chapter.word_count,
    volume_title: volumeTitle
  }
}

function readinessClass(status: SubmissionReadinessStatus): string {
  if (status === 'ready') return 'text-[var(--success-primary)]'
  if (status === 'draft') return 'text-[var(--warning-primary)]'
  return 'text-[var(--danger-primary)]'
}

function statToneClass(tone: 'default' | 'success' | 'warning' | 'danger'): string {
  if (tone === 'success') return 'text-[var(--success-primary)]'
  if (tone === 'warning') return 'text-[var(--warning-primary)]'
  if (tone === 'danger') return 'text-[var(--danger-primary)]'
  return 'text-[var(--text-primary)]'
}

export default function AuthorGrowthModal() {
  const closeModal = useUIStore((s) => s.closeModal)
  const openModal = useUIStore((s) => s.openModal)
  const modalData = useUIStore((s) => s.modalData)
  const bookId = useBookStore((s) => s.currentBookId)
  const books = useBookStore((s) => s.books)
  const volumes = useChapterStore((s) => s.volumes)
  const currentChapter = useChapterStore((s) => s.currentChapter)
  const config = useConfigStore((s) => s.config)
  const warningCount = useForeshadowStore((s) => s.getWarningCount())
  const [tab, setTab] = useState<AuthorGrowthTab>(() => (isAuthorGrowthTab(modalData?.tab) ? modalData.tab : 'sprint'))
  const [chapters, setChapters] = useState<PublishCheckChapter[]>([])
  const [todayWords, setTodayWords] = useState(0)
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(false)
  const [targetWords, setTargetWords] = useState(2000)
  const [targetMinutes, setTargetMinutes] = useState(30)
  const [sprintStartedAt, setSprintStartedAt] = useState<Date | null>(null)
  const [sprintStartWords, setSprintStartWords] = useState<number | null>(null)
  const [presetId, setPresetId] = useState(SUBMISSION_GUIDE_PRESETS[0]!.id)

  const book = books.find((item) => item.id === bookId)

  const fallbackChapters = useMemo(() => {
    const byId = new Map<number, PublishCheckChapter>()
    for (const volume of volumes) {
      for (const chapter of volume.chapters || []) {
        byId.set(chapter.id, toPublishCheckChapter(chapter, volume.title))
      }
    }
    if (currentChapter && !byId.has(currentChapter.id)) {
      byId.set(currentChapter.id, toPublishCheckChapter(currentChapter))
    }
    return Array.from(byId.values())
  }, [currentChapter, volumes])

  const availableChapters = chapters.length > 0 ? chapters : fallbackChapters
  const totalWords = availableChapters.reduce((sum, chapter) => sum + (chapter.word_count ?? 0), 0) || book?.total_words || 0
  const publishPackage = useMemo(() => {
    return buildPublishPackage('book', availableChapters, getSensitiveWords(config?.sensitive_list || 'default'))
  }, [availableChapters, config?.sensitive_list])
  const publishDangerCount = publishPackage.issues.filter((issue) => issue.severity === 'danger').length
  const publishWarningCount = publishPackage.issues.filter((issue) => issue.severity === 'warning').length
  const growthModel = buildGrowthSnapshotModel({
    todayWords,
    totalWords,
    chapterCount: availableChapters.length,
    streakDays: streak,
    warningCount,
    publishDangerCount,
    publishWarningCount,
    sprintCount: sprintStartedAt ? 1 : 0
  })
  const selectedPreset = SUBMISSION_GUIDE_PRESETS.find((preset) => preset.id === presetId) ?? SUBMISSION_GUIDE_PRESETS[0]!
  const readiness = buildSubmissionReadiness(publishPackage, selectedPreset)
  const sprintDelta = Math.max(0, totalWords - (sprintStartWords ?? totalWords))

  const refresh = useCallback(async () => {
    if (!bookId) return
    setLoading(true)
    try {
      const today = getLocalDateKey()
      const [rows, daily, achievement] = await Promise.all([
        window.api.getAllChaptersForBook(bookId) as Promise<PublishCheckChapter[]>,
        window.api.getDailyStats(bookId, today) as Promise<{ word_count?: number }>,
        window.api.getAchievementStats(bookId) as Promise<{ streak?: number }>
      ])
      setChapters(rows)
      setTodayWords(daily.word_count ?? 0)
      setStreak(achievement.streak ?? 0)
    } catch (error) {
      useToastStore.getState().addToast('error', error instanceof Error ? error.message : '读取作者成长数据失败')
    } finally {
      setLoading(false)
    }
  }, [bookId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function copyText(text: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(text)
      useToastStore.getState().addToast('success', successMessage)
    } catch {
      useToastStore.getState().addToast('error', '复制失败，请检查剪贴板权限')
    }
  }

  function startSprint() {
    setSprintStartWords(totalWords)
    setSprintStartedAt(new Date())
    useToastStore.getState().addToast('success', '本地写作冲刺已开始')
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 text-[var(--text-primary)] backdrop-blur-sm animate-fade-in">
      <div className="flex max-h-[82vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-[var(--border-primary)] bg-[var(--surface-elevated)] shadow-2xl">
        <header className="grid grid-cols-[40px_1fr_40px] items-center border-b border-[var(--border-primary)] bg-[var(--bg-primary)] px-4 py-3">
          <div className="h-9 w-9" aria-hidden />
          <div className="min-w-0 text-center">
            <h2 className="truncate text-base font-bold tracking-wide text-[var(--accent-secondary)]">作者成长工作台</h2>
            <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">{book?.title || '当前作品'} · 本地统计优先</p>
          </div>
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

        <div className="flex flex-wrap gap-2 border-b border-[var(--border-primary)] bg-[var(--surface-elevated)] px-4 py-3">
          <TabButton active={tab === 'sprint'} icon={<Rocket size={14} />} label="冲刺" onClick={() => setTab('sprint')} />
          <TabButton active={tab === 'weekly'} icon={<CalendarDays size={14} />} label="周报" onClick={() => setTab('weekly')} />
          <TabButton active={tab === 'submission'} icon={<Send size={14} />} label="投稿准备" onClick={() => setTab('submission')} />
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--accent-border)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            刷新
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {tab === 'sprint' && (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <section className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">轻量写作冲刺</h3>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">本地记录目标和完成字数，可复制统计结果；不创建公开房间，不上传正文。</p>
                  </div>
                  <Rocket className="h-5 w-5 text-[var(--accent-secondary)]" />
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <NumberField label="目标字数" value={targetWords} min={100} max={20000} step={100} onChange={setTargetWords} />
                  <NumberField label="目标分钟" value={targetMinutes} min={5} max={180} step={5} onChange={setTargetMinutes} />
                </div>
                <div className="mt-5 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] p-4">
                  <div className="flex items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
                    <span>当前冲刺进度</span>
                    <span>{sprintStartedAt ? `开始于 ${sprintStartedAt.toLocaleTimeString('zh-CN', { hour12: false })}` : '尚未开始'}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <div className="text-4xl font-bold tabular-nums text-[var(--accent-secondary)]">{sprintDelta.toLocaleString()}</div>
                    <div className="pb-1 text-sm text-[var(--text-muted)]">/ {targetWords.toLocaleString()} 字</div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent-primary)]"
                      style={{ width: `${Math.min(100, Math.round((sprintDelta / Math.max(1, targetWords)) * 100))}%` }}
                    />
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button type="button" className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--accent-primary)] px-4 text-sm font-semibold text-white transition hover:brightness-105" onClick={startSprint}>
                    <Target size={15} />
                    开始本地冲刺
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--border-primary)] px-4 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[var(--accent-border)] hover:text-[var(--text-primary)]"
                    onClick={() => void copyText(buildSprintResultText({
                      targetWords,
                      targetMinutes,
                      deltaWords: sprintDelta,
                      startedAt: sprintStartedAt,
                      finishedAt: new Date()
                    }), '冲刺结果已复制')}
                  >
                    <Clipboard size={15} />
                    复制结果
                  </button>
                </div>
              </section>

              <GrowthStats model={growthModel} />
            </div>
          )}

          {tab === 'weekly' && (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <section className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">可分享成长卡片</h3>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">默认只复制统计和准备状态，不包含正文、人物设定或 AI 草稿。</p>
                  </div>
                  <Trophy className="h-5 w-5 text-[var(--accent-secondary)]" />
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {growthModel.shareStats.map((item) => (
                    <div key={item.label} className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] p-4">
                      <div className="text-xs text-[var(--text-muted)]">{item.label}</div>
                      <div className={`mt-2 text-2xl font-bold tabular-nums ${statToneClass(item.tone)}`}>{item.value}</div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-5 inline-flex h-9 items-center gap-2 rounded-md bg-[var(--accent-primary)] px-4 text-sm font-semibold text-white transition hover:brightness-105"
                  onClick={() => void copyText(buildGrowthShareText(growthModel), '成长卡片已复制')}
                >
                  <Clipboard size={15} />
                  复制成长卡片
                </button>
              </section>

              <GrowthStats model={growthModel} />
            </div>
          )}

          {tab === 'submission' && (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <section className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">投稿与平台适配助手</h3>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">生成发布前检查和投稿准备清单；不登录第三方平台，不代投。</p>
                  </div>
                  <FileCheck2 className="h-5 w-5 text-[var(--accent-secondary)]" />
                </div>

                <label className="mt-5 block text-xs font-semibold text-[var(--text-secondary)]">
                  准备档位
                  <select
                    className="mt-2 h-9 w-full rounded-md border border-[var(--border-primary)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-border)]"
                    value={presetId}
                    onChange={(event) => setPresetId(event.target.value)}
                  >
                    {SUBMISSION_GUIDE_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>{preset.name}</option>
                    ))}
                  </select>
                </label>

                <div className="mt-5 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] p-4">
                  <div className="text-xs text-[var(--text-muted)]">准备状态</div>
                  <div className={`mt-2 text-2xl font-bold ${readinessClass(readiness.status)}`}>{readiness.statusLabel}</div>
                  <div className="mt-2 text-xs text-[var(--text-muted)]">
                    {readiness.safeSummary.wordCount.toLocaleString()} 字 · {readiness.safeSummary.chapterCount} 章 · {readiness.safeSummary.dangerIssueCount} 个阻断
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Checklist title="阻断项" items={readiness.blockers} empty="暂无阻断项" tone="danger" />
                  <Checklist title="提醒项" items={readiness.warnings} empty="暂无提醒项" tone="warning" />
                </div>
                <Checklist title="建议" items={readiness.suggestions} empty="暂无建议" tone="default" />

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--accent-primary)] px-4 text-sm font-semibold text-white transition hover:brightness-105"
                    onClick={() => void copyText(buildSubmissionChecklistText(readiness, selectedPreset), '投稿准备清单已复制')}
                  >
                    <Clipboard size={15} />
                    复制清单
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--border-primary)] px-4 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[var(--accent-border)] hover:text-[var(--text-primary)]"
                    onClick={() => openModal('publishCheck', { scope: 'book' })}
                  >
                    <FileCheck2 size={15} />
                    发布检查
                  </button>
                </div>
              </section>

              <GrowthStats model={growthModel} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TabButton({
  active,
  icon,
  label,
  onClick
}: {
  active: boolean
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition ${
        active
          ? 'border-[var(--accent-border)] bg-[var(--accent-surface)] text-[var(--accent-secondary)]'
          : 'border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:border-[var(--accent-border)] hover:text-[var(--text-primary)]'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) {
  return (
    <label className="block text-xs font-semibold text-[var(--text-secondary)]">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Math.min(max, Math.max(min, Math.trunc(Number(event.target.value) || min))))}
        className="mt-2 h-9 w-full rounded-md border border-[var(--border-primary)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-border)]"
      />
    </label>
  )
}

function GrowthStats({ model }: { model: ReturnType<typeof buildGrowthSnapshotModel> }) {
  return (
    <aside className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-4">
      <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
        <CheckCircle2 size={16} className="text-[var(--success-primary)]" />
        当前成长证据
      </div>
      <div className="mt-4 space-y-3">
        {model.shareStats.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 rounded-md border border-[var(--border-primary)] bg-[var(--surface-secondary)] px-3 py-2">
            <span className="text-xs text-[var(--text-muted)]">{item.label}</span>
            <span className={`text-sm font-bold tabular-nums ${statToneClass(item.tone)}`}>{item.value}</span>
          </div>
        ))}
      </div>
    </aside>
  )
}

function Checklist({
  title,
  items,
  empty,
  tone
}: {
  title: string
  items: string[]
  empty: string
  tone: 'default' | 'warning' | 'danger'
}) {
  const titleClass =
    tone === 'danger'
      ? 'text-[var(--danger-primary)]'
      : tone === 'warning'
        ? 'text-[var(--warning-primary)]'
        : 'text-[var(--text-primary)]'
  return (
    <div className="mt-4 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] p-4">
      <div className={`text-xs font-bold ${titleClass}`}>{title}</div>
      <ul className="mt-2 space-y-2 text-xs leading-relaxed text-[var(--text-secondary)]">
        {items.length > 0 ? items.map((item) => <li key={item}>· {item}</li>) : <li className="text-[var(--text-muted)]">{empty}</li>}
      </ul>
    </div>
  )
}
