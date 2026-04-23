import type { Character } from '@/types'

export type TimelineChapter = { id: number; title: string }

interface AppearanceTimelineProps {
  characters: Character[]
  chapters: TimelineChapter[]
  appearanceChapterIds: Map<number, Set<number>>
  factionColor: (faction: string) => string
}

export default function AppearanceTimeline({
  characters,
  chapters,
  appearanceChapterIds,
  factionColor
}: AppearanceTimelineProps) {
  if (characters.length === 0 || chapters.length === 0) {
    return <p className="py-12 text-center text-sm text-[var(--text-muted)]">暂无章节或角色数据</p>
  }

  return (
    <div className="max-h-[calc(90vh-200px)] overflow-auto rounded-lg border border-[var(--border-primary)]">
      <table className="w-max min-w-full border-collapse text-[10px]">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 min-w-[100px] border-b border-r border-[var(--border-primary)] bg-[var(--bg-primary)] px-2 py-1.5 text-left font-bold text-[var(--text-muted)]">
              角色
            </th>
            {chapters.map((ch, i) => (
              <th
                key={ch.id}
                title={ch.title}
                className="max-w-[72px] truncate whitespace-nowrap border-b border-[var(--border-primary)] px-1 py-1 font-normal text-[var(--text-muted)]"
              >
                {i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {characters.map((c) => {
            const set = appearanceChapterIds.get(c.id)
            const col = factionColor(c.faction)
            return (
              <tr key={c.id}>
                <td className="sticky left-0 z-[1] max-w-[140px] truncate whitespace-nowrap border-r border-[var(--border-primary)] bg-[var(--bg-primary)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-primary)]">
                  {c.name}
                </td>
                {chapters.map((ch) => {
                  const hit = set?.has(ch.id)
                  return (
                    <td
                      key={ch.id}
                      className={`border-b border-[var(--border-primary)] p-0 align-middle text-center ${hit ? 'bg-[var(--accent-surface)]' : ''}`}
                    >
                      {hit ? (
                        <div
                          className="mx-auto h-2 w-2 rounded-full"
                          style={{
                            background: col,
                            boxShadow: `0 0 6px ${col}88`
                          }}
                        />
                      ) : (
                        <span className="inline-block h-2 w-2" />
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
