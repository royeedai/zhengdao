import { useState, useEffect } from 'react'
import { Users } from 'lucide-react'
import { useCharacterStore } from '@/stores/character-store'
import { useConfigStore } from '@/stores/config-store'
import { useChapterStore } from '@/stores/chapter-store'
import { useUIStore } from '@/stores/ui-store'

const FACTION_UI: Record<
  string,
  { bar: string; name: string; badge: string; hoverBorder: string }
> = {
  indigo: {
    bar: 'bg-indigo-500/50',
    name: 'text-indigo-400',
    badge: 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400',
    hoverBorder: 'hover:border-indigo-500/50'
  },
  red: {
    bar: 'bg-red-500/50',
    name: 'text-red-400',
    badge: 'bg-red-500/10 border border-red-500/20 text-red-400',
    hoverBorder: 'hover:border-red-500/50'
  },
  amber: {
    bar: 'bg-amber-500/50',
    name: 'text-amber-400',
    badge: 'bg-amber-500/10 border border-amber-500/20 text-amber-400',
    hoverBorder: 'hover:border-amber-500/50'
  },
  slate: {
    bar: 'bg-slate-500/50',
    name: 'text-slate-400',
    badge: 'bg-slate-500/10 border border-slate-500/20 text-slate-400',
    hoverBorder: 'hover:border-slate-500/50'
  }
}

export default function ActiveCharacters() {
  const characters = useCharacterStore((s) => s.characters)
  const config = useConfigStore((s) => s.config)
  const openModal = useUIStore((s) => s.openModal)
  const currentChapter = useChapterStore((s) => s.currentChapter)
  const factionLabels = config?.faction_labels || []
  const [filter, setFilter] = useState<'all' | 'current'>('all')
  const [currentCharIds, setCurrentCharIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    let cancelled = false
    const chapterId = currentChapter?.id
    if (!chapterId) {
      setCurrentCharIds(new Set())
      return
    }
    const fetchAppearances = async () => {
      try {
        const ids: number[] = await window.api.getChapterAppearances(chapterId)
        if (!cancelled) setCurrentCharIds(new Set(ids))
      } catch {
        if (!cancelled) setCurrentCharIds(new Set())
      }
    }
    void fetchAppearances()
    return () => { cancelled = true }
  }, [currentChapter?.id])

  const getFactionUi = (faction: string) => {
    const f = factionLabels.find((l) => l.value === faction)
    const key = f?.color && FACTION_UI[f.color] ? f.color : 'slate'
    return FACTION_UI[key] || FACTION_UI.slate
  }

  const filteredChars =
    filter === 'current'
      ? characters.filter((c) => currentCharIds.has(c.id))
      : characters

  const displayChars = filteredChars.slice(0, 12)

  return (
    <div className="p-4 flex-1 overflow-y-auto border-b border-[#2a2a2a]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-slate-300 flex items-center uppercase tracking-wider">
          <Users size={14} className="mr-1.5 text-indigo-400" /> 角色速览
        </h3>
        <div className="flex text-[9px] bg-[#111] rounded border border-[#333] overflow-hidden">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-0.5 transition ${filter === 'all' ? 'bg-indigo-600/30 text-indigo-300' : 'text-slate-500 hover:text-slate-300'}`}
          >
            全部
          </button>
          <button
            onClick={() => setFilter('current')}
            className={`px-2 py-0.5 transition ${filter === 'current' ? 'bg-indigo-600/30 text-indigo-300' : 'text-slate-500 hover:text-slate-300'}`}
          >
            本章
          </button>
        </div>
      </div>
      {displayChars.length === 0 ? (
        <p className="text-[11px] text-slate-600 text-center py-2">
          {filter === 'current' ? '本章暂无出场角色' : '暂无角色'}
        </p>
      ) : (
        <div className="space-y-2">
          {displayChars.map((char) => {
            const ui = getFactionUi(char.faction)
            const inChapter = currentCharIds.has(char.id)
            return (
              <div
                key={char.id}
                onClick={() => openModal('character', { ...char })}
                className={`bg-[#222] p-3 rounded border border-[#333] ${ui.hoverBorder} cursor-pointer transition-colors shadow-sm relative overflow-hidden`}
              >
                <div className={`absolute top-0 left-0 w-1 h-full ${ui.bar}`} />
                <div className="flex justify-between items-center pl-2">
                  <span className={`font-bold ${ui.name} text-sm tracking-wide`}>
                    {char.name}
                    {inChapter && filter === 'all' && (
                      <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 align-middle" title="本章出场" />
                    )}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${ui.badge}`}>
                    {factionLabels.find((l) => l.value === char.faction)?.label || char.faction}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
