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
    return <p className="text-center text-slate-500 text-sm py-12">暂无章节或角色数据</p>
  }

  return (
    <div className="overflow-auto max-h-[calc(90vh-200px)] rounded-lg border border-[#333]">
      <table className="w-max min-w-full border-collapse text-[10px]">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-[#141414] border-b border-r border-[#333] px-2 py-1.5 text-left text-slate-500 font-bold min-w-[100px]">
              角色
            </th>
            {chapters.map((ch, i) => (
              <th
                key={ch.id}
                title={ch.title}
                className="border-b border-[#333] px-1 py-1 text-slate-500 font-normal whitespace-nowrap max-w-[72px] truncate"
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
                <td className="sticky left-0 z-[1] bg-[#141414] border-r border-[#333] px-2 py-0.5 text-slate-300 text-[11px] whitespace-nowrap max-w-[140px] truncate font-medium">
                  {c.name}
                </td>
                {chapters.map((ch) => {
                  const hit = set?.has(ch.id)
                  return (
                    <td
                      key={ch.id}
                      className={`border-b border-[#2a2a2a] p-0 align-middle text-center ${hit ? 'bg-[#1a1a14]' : ''}`}
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
