import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Scale, X } from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'
import { useCharacterStore } from '@/stores/character-store'
import { useConfigStore } from '@/stores/config-store'
import type { Character } from '@/types'

export default function CharacterCompareModal() {
  const closeModal = useUIStore((s) => s.closeModal)
  const characters = useCharacterStore((s) => s.characters)
  const config = useConfigStore((s) => s.config)
  const factionLabels = config?.faction_labels || []
  const statusLabels = config?.status_labels || []
  const characterFields = config?.character_fields || []

  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [appearanceCounts, setAppearanceCounts] = useState<Record<number, number>>({})

  const factionLabel = (value: string) => factionLabels.find((f) => f.value === value)?.label || value
  const factionColor = (value: string) => factionLabels.find((f) => f.value === value)?.color || 'var(--text-muted)'
  const statusLabel = (value: string) => statusLabels.find((s) => s.value === value)?.label || value

  const toggle = (id: number) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 4) return prev
      return [...prev, id]
    })
  }

  const selectedCharacters = useMemo(() => {
    const map = new Map(characters.map((c) => [c.id, c]))
    return selectedIds.map((id) => map.get(id)).filter(Boolean) as Character[]
  }, [characters, selectedIds])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const next: Record<number, number> = {}
      for (const id of selectedIds) {
        const apps = await window.api.getCharacterAppearances(id)
        next[id] = apps.length
      }
      if (!cancelled) setAppearanceCounts(next)
    })()
    return () => {
      cancelled = true
    }
  }, [selectedIds])

  const rows: { key: string; label: string; render: (c: Character) => ReactNode }[] = [
    {
      key: 'faction',
      label: '阵营',
      render: (c) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: factionColor(c.faction) }} />
          {factionLabel(c.faction)}
        </span>
      )
    },
    {
      key: 'status',
      label: '状态',
      render: (c) => statusLabel(c.status)
    },
    ...characterFields.map((field) => ({
      key: `cf_${field.key}`,
      label: field.label,
      render: (c: Character) => c.custom_fields?.[field.key] || '—'
    })),
    {
      key: 'appearances',
      label: '出场章节数',
      render: (c) => appearanceCounts[c.id] ?? '…'
    },
    {
      key: 'desc',
      label: '备注',
      render: (c) => <span className="whitespace-pre-wrap text-[var(--text-secondary)]">{c.description || '—'}</span>
    }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="flex max-h-[90vh] w-full max-w-[960px] flex-col overflow-hidden rounded-xl border border-[var(--border-primary)] bg-[var(--surface-elevated)] shadow-2xl">
        <div className="flex h-12 items-center justify-between border-b border-[var(--border-primary)] bg-[var(--bg-primary)] px-5 shrink-0">
          <div className="flex items-center space-x-2 font-bold text-[var(--accent-secondary)]">
            <Scale size={18} />
            <span>角色对比</span>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="border-b border-[var(--border-primary)] p-4 shrink-0">
          <p className="mb-2 text-[11px] text-[var(--text-muted)]">选择 2–4 名角色（点击切换）</p>
          <div className="flex flex-wrap gap-2">
            {characters.map((c) => {
              const on = selectedIds.includes(c.id)
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.id)}
                  className={`text-xs px-2 py-1 rounded border transition ${
                    on
                      ? 'border-[var(--accent-border)] bg-[var(--accent-surface)] text-[var(--accent-secondary)]'
                      : 'border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:border-[var(--border-secondary)]'
                  }`}
                >
                  {c.name}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {selectedCharacters.length < 2 ? (
            <p className="py-16 text-center text-sm text-[var(--text-muted)]">请至少选择两名角色进行对比</p>
          ) : (
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="w-28 border-b border-[var(--border-primary)] pb-2 pr-4 text-left font-bold text-[var(--text-muted)]">字段</th>
                  {selectedCharacters.map((c) => (
                    <th
                      key={c.id}
                      className="min-w-[140px] border-b border-[var(--border-primary)] px-2 pb-2 text-left font-bold text-[var(--text-primary)]"
                    >
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    <td className="border-b border-[var(--border-primary)] py-2 pr-4 align-top text-[var(--text-muted)]">{row.label}</td>
                    {selectedCharacters.map((c) => (
                      <td key={c.id} className="border-b border-[var(--border-primary)] px-2 py-2 align-top text-[var(--text-primary)]">
                        {row.render(c)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
