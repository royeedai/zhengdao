import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { BookMarked, Building2, CalendarClock, Loader2, Network, UserRound } from 'lucide-react'
import type { AiWorkProfile } from '@/utils/ai/assistant-workflow'

/**
 * CG-A3.2 — CanonPackPanel.
 *
 * 三 tab 容器: 关系图谱 / 时间线 / 组织架构。每个 view lazy import 分
 * 离 chunk, 第一次切换该 tab 才下载对应库 (reactflow ~80KB,
 * vis-timeline ~150KB, react-d3-tree ~60KB)。
 */

const RelationGraphView = lazy(() => import('./RelationGraphView'))
const TimelineView = lazy(() => import('./TimelineView'))
const OrgChartView = lazy(() => import('./OrgChartView'))
const CharacterCardsView = lazy(() => import('./CharacterCardsView'))
const ReferencePackView = lazy(() => import('./ReferencePackView'))

export type CanonPackTab = 'cards' | 'relations' | 'timeline' | 'orgchart' | 'reference'
export type CanonPackKind = 'canon' | 'reference'

interface Props {
  bookId: number
  initialTab?: CanonPackTab
  packKind?: CanonPackKind
  profile?: AiWorkProfile | null
  onProfileUpdated?: (profile: AiWorkProfile | null) => void
  onSelectChapter?: (chapterNumber: number) => void
}

const CANON_TABS: Array<{ id: CanonPackTab; label: string; Icon: typeof Network }> = [
  { id: 'cards', label: '角色卡', Icon: UserRound },
  { id: 'relations', label: '关系图谱', Icon: Network },
  { id: 'timeline', label: '事件时间线', Icon: CalendarClock },
  { id: 'orgchart', label: '组织架构', Icon: Building2 }
]

const REFERENCE_TABS: Array<{ id: CanonPackTab; label: string; Icon: typeof Network }> = [
  { id: 'reference', label: 'Reference Pack', Icon: BookMarked }
]

function FallbackSpinner() {
  return (
    <div className="flex h-full items-center justify-center text-xs text-[var(--text-muted)]">
      <Loader2 size={14} className="mr-2 animate-spin" />
      正在加载视图…
    </div>
  )
}

export default function CanonPackPanel({
  bookId,
  initialTab = 'cards',
  packKind = 'canon',
  profile,
  onProfileUpdated,
  onSelectChapter
}: Props) {
  const [tab, setTab] = useState<CanonPackTab>(initialTab)
  const tabs = useMemo(() => (packKind === 'reference' ? REFERENCE_TABS : CANON_TABS), [packKind])

  useEffect(() => {
    if (!tabs.some((item) => item.id === tab)) {
      setTab(tabs[0]?.id ?? 'cards')
    }
  }, [tab, tabs])

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b border-[var(--border-primary)] bg-[var(--bg-primary)] px-2 py-1">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
              tab === id
                ? 'bg-[var(--accent-surface)] text-[var(--accent-secondary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>
      <div className="relative flex-1">
        <Suspense fallback={<FallbackSpinner />}>
          {tab === 'cards' && <CharacterCardsView bookId={bookId} />}
          {tab === 'relations' && <RelationGraphView bookId={bookId} />}
          {tab === 'timeline' && <TimelineView bookId={bookId} onSelectChapter={onSelectChapter} />}
          {tab === 'orgchart' && <OrgChartView bookId={bookId} />}
          {tab === 'reference' && (
            <ReferencePackView bookId={bookId} profile={profile} onProfileUpdated={onProfileUpdated} />
          )}
        </Suspense>
      </div>
    </div>
  )
}
