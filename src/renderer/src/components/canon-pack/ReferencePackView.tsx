import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { BookMarked, Loader2, Tags } from 'lucide-react'
import { useToastStore } from '@/stores/toast-store'
import type { AiWorkProfile, CanonLockEntry } from '@/utils/ai/assistant-workflow'

interface CitationRow {
  id: number
  citekey: string
  citation_type: string
  authors?: string
  title?: string
  year?: number | null
  journal?: string
  publisher?: string
  doi?: string
  url?: string
  notes?: string
}

interface ReferenceEntry {
  id: string
  label: string
  value: string
}

interface ReferenceMeta {
  terminology?: unknown
  keyArguments?: unknown
  policies?: unknown
  referencePack?: {
    terminology?: unknown
    keyArguments?: unknown
    policies?: unknown
    upgradedFromV1At?: string
  }
}

interface Props {
  bookId: number
  profile?: AiWorkProfile | null
  onProfileUpdated?: (profile: AiWorkProfile | null) => void
}

function parseJson<T>(raw?: string, fallback: T = {} as T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function normalizeEntries(value: unknown): ReferenceEntry[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item, index): ReferenceEntry | null => {
      if (typeof item === 'string') {
        const trimmed = item.trim()
        return trimmed ? { id: `entry-${index + 1}`, label: trimmed.slice(0, 80), value: trimmed } : null
      }
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const label = String(row.label || row.term || row.title || row.name || `条目 ${index + 1}`).trim()
      const value = String(row.value || row.definition || row.description || row.text || '').trim()
      return label && value ? { id: String(row.id || `entry-${index + 1}`), label, value } : null
    })
    .filter((item): item is ReferenceEntry => Boolean(item))
}

function Section({
  title,
  icon,
  count,
  children
}: {
  title: string
  icon: ReactNode
  count: number
  children: ReactNode
}) {
  return (
    <section className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)]">
      <div className="flex items-center gap-2 border-b border-[var(--border-primary)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]">
        {icon}
        {title}
        <span className="ml-auto font-mono text-xs text-[var(--text-muted)]">{count}</span>
      </div>
      <div className="p-3">{children}</div>
    </section>
  )
}

export default function ReferencePackView({ bookId, profile, onProfileUpdated }: Props) {
  const [citations, setCitations] = useState<CitationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)
  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const rows = (await window.api.listCitations(bookId)) as CitationRow[]
        if (!cancelled) setCitations(rows || [])
      } catch (err) {
        if (!cancelled) addToast('error', `加载 Reference Pack 失败: ${(err as Error).message ?? err}`)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [bookId, addToast])

  const canonLocks = useMemo(
    () => parseJson<CanonLockEntry[]>(profile?.canon_pack_locks, []).filter((item) => item?.label && item?.value),
    [profile?.canon_pack_locks]
  )
  const meta = useMemo(() => parseJson<ReferenceMeta>(profile?.genre_meta, {}), [profile?.genre_meta])
  const referenceMeta = meta.referencePack || meta
  const terminology = useMemo(() => normalizeEntries(referenceMeta.terminology), [referenceMeta.terminology])
  const keyArguments = useMemo(() => normalizeEntries(referenceMeta.keyArguments), [referenceMeta.keyArguments])
  const policies = useMemo(() => normalizeEntries(referenceMeta.policies), [referenceMeta.policies])
  const fallbackEntries = keyArguments.length === 0 ? canonLocks.slice(0, 30) : []

  async function upgradeFromV1() {
    if (!profile || canonLocks.length === 0) return
    setUpgrading(true)
    try {
      const nextMeta: ReferenceMeta & { referencePackVersion?: string } = {
        ...meta,
        referencePackVersion: 'v2',
        referencePack: {
          ...(meta.referencePack || {}),
          terminology: referenceMeta.terminology,
          policies: referenceMeta.policies,
          upgradedFromV1At: new Date().toISOString(),
          keyArguments: canonLocks.map((lock) => ({
            id: lock.id,
            label: lock.label,
            value: lock.value,
            priority: lock.priority
          }))
        }
      }
      await window.api.aiSaveWorkProfile(bookId, { genre_meta: JSON.stringify(nextMeta) })
      const updated = (await window.api.aiGetWorkProfile(bookId)) as AiWorkProfile | null
      onProfileUpdated?.(updated)
      addToast('success', 'Reference Pack v2 已从旧版锁定项生成')
    } catch (err) {
      addToast('error', `升级 Reference Pack 失败: ${(err as Error).message ?? err}`)
    } finally {
      setUpgrading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-[var(--text-muted)]">
        <Loader2 size={14} className="mr-2 animate-spin" /> 加载中…
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto bg-[var(--bg-secondary)] p-4">
      {fallbackEntries.length > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border border-[var(--warning-primary)] bg-[var(--warning-surface)] px-3 py-2 text-xs text-[var(--warning-primary)]">
          <span className="flex-1">正在使用 v1 Canon 锁定项作为 Reference Pack fallback。</span>
          <button
            type="button"
            onClick={() => void upgradeFromV1()}
            disabled={upgrading}
            className="rounded border border-current px-2 py-1 disabled:opacity-60"
          >
            {upgrading ? '升级中…' : '升级到 v2'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Section title="引用列表" icon={<BookMarked size={14} />} count={citations.length}>
          {citations.length === 0 ? (
            <div className="text-xs text-[var(--text-muted)]">暂无引用条目。</div>
          ) : (
            <div className="space-y-2">
              {citations.map((citation) => (
                <div key={citation.id} className="rounded border border-[var(--border-primary)] p-2 text-xs">
                  <div className="font-semibold text-[var(--text-primary)]">{citation.citekey}</div>
                  <div className="mt-1 text-[var(--text-secondary)]">{citation.title || '未命名来源'}</div>
                  <div className="mt-1 text-[var(--text-muted)]">
                    {[citation.authors, citation.year, citation.journal || citation.publisher, citation.doi || citation.url]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="术语表" icon={<Tags size={14} />} count={terminology.length}>
          <EntryList entries={terminology} empty="暂无术语条目。" />
        </Section>

        <Section title="关键论点" icon={<BookMarked size={14} />} count={keyArguments.length || fallbackEntries.length}>
          <EntryList
            entries={
              keyArguments.length > 0
                ? keyArguments
                : fallbackEntries.map((lock) => ({ id: lock.id, label: lock.label, value: lock.value }))
            }
            empty="暂无关键论点。"
          />
        </Section>

        <Section title="政策对照" icon={<Tags size={14} />} count={policies.length}>
          <EntryList entries={policies} empty="暂无政策条目。" />
        </Section>
      </div>
    </div>
  )
}

function EntryList({ entries, empty }: { entries: ReferenceEntry[]; empty: string }) {
  if (entries.length === 0) return <div className="text-xs text-[var(--text-muted)]">{empty}</div>
  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div key={entry.id} className="rounded border border-[var(--border-primary)] p-2 text-xs">
          <div className="font-semibold text-[var(--text-primary)]">{entry.label}</div>
          <div className="mt-1 whitespace-pre-wrap leading-5 text-[var(--text-secondary)]">{entry.value}</div>
        </div>
      ))}
    </div>
  )
}
