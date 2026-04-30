import { useEffect, useMemo, useState } from 'react'
import { Loader2, UserRound } from 'lucide-react'
import { useToastStore } from '@/stores/toast-store'

interface CharacterRow {
  id: number
  name: string
  faction?: string | null
  status?: string | null
  description?: string
  avatar_path?: string | null
  custom_fields?: Record<string, unknown>
}

interface RelationRow {
  source_id: number
  target_id: number
}

interface CharacterCardsApi {
  getCharacters(bookId: number): Promise<CharacterRow[]>
  getRelations(bookId: number): Promise<RelationRow[]>
}

interface Props {
  bookId: number
}

export default function CharacterCardsView({ bookId }: Props) {
  const [characters, setCharacters] = useState<CharacterRow[]>([])
  const [relations, setRelations] = useState<RelationRow[]>([])
  const [loading, setLoading] = useState(true)
  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const api = window.api as unknown as CharacterCardsApi
        const [chars, rels] = await Promise.all([api.getCharacters(bookId), api.getRelations(bookId)])
        if (cancelled) return
        setCharacters(chars || [])
        setRelations(rels || [])
      } catch (err) {
        if (!cancelled) addToast('error', `加载角色卡失败: ${(err as Error).message ?? err}`)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [bookId, addToast])

  const relationCounts = useMemo(() => {
    const counts = new Map<number, number>()
    relations.forEach((relation) => {
      counts.set(relation.source_id, (counts.get(relation.source_id) || 0) + 1)
      counts.set(relation.target_id, (counts.get(relation.target_id) || 0) + 1)
    })
    return counts
  }, [relations])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-[var(--text-muted)]">
        <Loader2 size={14} className="mr-2 animate-spin" /> 加载中…
      </div>
    )
  }

  if (characters.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-[var(--text-muted)]">
        该作品暂无角色卡。
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto bg-[var(--bg-secondary)] p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {characters.map((character) => {
          const customFields = character.custom_fields || {}
          const aliases = Array.isArray(customFields.aliases) ? customFields.aliases.slice(0, 3) : []
          return (
            <article
              key={character.id}
              className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--accent-surface)] text-[var(--accent-secondary)]">
                  {character.avatar_path ? (
                    <img src={character.avatar_path} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <UserRound size={22} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{character.name}</div>
                  <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-[var(--text-muted)]">
                    {character.faction && <span>{character.faction}</span>}
                    {character.status && <span>{character.status}</span>}
                    <span>关系 {relationCounts.get(character.id) || 0}</span>
                  </div>
                </div>
              </div>
              {aliases.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {aliases.map((alias) => (
                    <span
                      key={String(alias)}
                      className="rounded border border-[var(--border-primary)] px-1.5 py-0.5 text-[11px] text-[var(--text-muted)]"
                    >
                      {String(alias)}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-xs leading-5 text-[var(--text-secondary)]">
                {character.description || '暂无角色描述。'}
              </p>
            </article>
          )
        })}
      </div>
    </div>
  )
}
