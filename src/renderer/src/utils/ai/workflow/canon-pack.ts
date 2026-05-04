import { clip, nonEmpty } from './helpers'
import type {
  AiCanonPack,
  AiCanonPackEvent,
  AiCanonPackOrganization,
  AiReferencePackEntry,
  CanonLockEntry,
  AiCanonPackRelation,
  AiWorkProfile
} from './types'

/**
 * SPLIT-008 / DI-07 v3.3 — buildDesktopCanonPack.
 *
 * Shape the local data the renderer has (book + work profile + selection
 * + characters + foreshadowings + plot nodes + local citations + DI-07 v3
 * relations / events / organizations) into the JSON contract the backend
 * Skill execution layer + DI-07 v1 lock panel + CG-A3 visual views all
 * consume. v2 keeps the v0.1/v0.2 fields untouched, then adds an explicit
 * Canon vs Reference Pack kind so academic/professional projects can pass
 * citations, terminology and key arguments without pretending they are
 * fiction-world facts.
 */

const RELATIONS_CAP = 100
const EVENTS_CAP = 50
const ORGS_CAP = 30
const REFERENCE_CAP = 80

interface ReferencePackMeta {
  terminology?: unknown
  keyArguments?: unknown
  policies?: unknown
  referencePack?: {
    terminology?: unknown
    keyArguments?: unknown
    policies?: unknown
  }
}

export interface DesktopRelationInput {
  fromId: number
  toId: number
  kind: string
  label?: string
  chapterRange?: [number, number]
  dynamic?: boolean
}

export interface DesktopEventInput {
  id: number
  title: string
  description?: string
  chapterNumber?: number | null
  eventType?: 'plot' | 'character' | 'world' | 'foreshadow'
  importance?: 'low' | 'normal' | 'high'
  relatedCharacterIds?: number[]
}

export interface DesktopOrganizationInput {
  id: number
  name: string
  description?: string
  parentId?: number | null
  orgType?: 'group' | 'faction' | 'company' | 'department'
  memberIds?: number[]
}

export function buildDesktopCanonPack(input: {
  bookId: number
  profile?: AiWorkProfile | null
  currentChapter?: { id: number; title: string; plainText: string } | null
  selectedText?: string
  characters?: Array<{ id: number; name: string; description?: string }>
  foreshadowings?: Array<{ id: number; text: string; status: string }>
  plotNodes?: Array<{ id: number; title: string; description?: string; chapter_number?: number }>
  relations?: DesktopRelationInput[]
  events?: DesktopEventInput[]
  organizations?: DesktopOrganizationInput[]
  localCitations?: Array<{
    ref: string
    sourceId: string
    title?: string
    excerpt: string
    score?: number
  }>
  generatedAt?: string
}): AiCanonPack {
  const profile = input.profile
  const kind = isReferenceGenre(profile?.genre) ? 'reference' : 'canon'
  const canonLocks = parseCanonLocks(profile?.canon_pack_locks)
  const referencePack = kind === 'reference'
    ? buildReferencePack(profile, input.localCitations || [], canonLocks)
    : undefined
  const relations = input.relations
    ? input.relations.slice(0, RELATIONS_CAP).map<AiCanonPackRelation>((relation) => ({
        fromId: String(relation.fromId),
        toId: String(relation.toId),
        kind: relation.kind,
        label: nonEmpty(relation.label) ? relation.label : undefined,
        chapterRange: relation.chapterRange,
        dynamic: relation.dynamic
      }))
    : undefined
  const events = input.events
    ? input.events.slice(0, EVENTS_CAP).map<AiCanonPackEvent>((event) => ({
        id: String(event.id),
        title: event.title,
        description: nonEmpty(event.description) ? event.description : undefined,
        chapterNumber: typeof event.chapterNumber === 'number' ? event.chapterNumber : undefined,
        eventType: event.eventType ?? 'plot',
        importance: event.importance ?? 'normal',
        relatedCharacterIds: event.relatedCharacterIds?.map((id) => String(id))
      }))
    : undefined
  const organizations = input.organizations
    ? input.organizations.slice(0, ORGS_CAP).map<AiCanonPackOrganization>((org) => ({
        id: String(org.id),
        name: org.name,
        description: nonEmpty(org.description) ? org.description : undefined,
        parentId:
          typeof org.parentId === 'number' && org.parentId !== null ? String(org.parentId) : undefined,
        orgType: org.orgType ?? 'group',
        memberIds: org.memberIds?.map((id) => String(id))
      }))
    : undefined

  return {
    version: 'canon-pack.v2',
    kind,
    bookId: input.bookId,
    style: {
      styleGuide: profile?.style_guide || undefined,
      styleFingerprint: profile?.style_fingerprint || undefined,
      genreRules: profile?.genre_rules || undefined,
      contentBoundaries: profile?.content_boundaries || undefined,
      assetRules: profile?.asset_rules || undefined,
      rhythmRules: profile?.rhythm_rules || undefined
    },
    scene: {
      selectedText: nonEmpty(input.selectedText) ? clip(input.selectedText || '', 1600) : undefined,
      currentChapter: input.currentChapter
        ? {
            id: String(input.currentChapter.id),
            title: input.currentChapter.title,
            excerpt: clip(input.currentChapter.plainText || '', 2600)
          }
        : undefined
    },
    assets: {
      characters: (input.characters || []).slice(0, 20).map((character) => ({
        id: String(character.id),
        name: character.name,
        description: nonEmpty(character.description) ? character.description : undefined
      })),
      foreshadowings: (input.foreshadowings || []).slice(0, 20).map((item) => ({
        id: String(item.id),
        text: item.text,
        status: item.status
      })),
      plotNodes: (input.plotNodes || []).slice(0, 20).map((node) => ({
        id: String(node.id),
        title: node.title,
        description: nonEmpty(node.description) ? node.description : undefined,
        chapterNumber: node.chapter_number
      })),
      relations,
      events,
      organizations,
      canonLocks: canonLocks.length > 0 ? canonLocks : undefined,
      references: referencePack?.references,
      terminology: referencePack?.terminology,
      keyArguments: referencePack?.keyArguments,
      policies: referencePack?.policies
    },
    retrieval: {
      mode: (input.localCitations || []).length > 0 ? 'local_keyword' : 'off',
      citations: input.localCitations || []
    },
    provenance: {
      source: 'desktop-local',
      generatedAt: input.generatedAt || new Date().toISOString(),
      userConfirmedOnly: true
    }
  }
}

export function isReferenceGenre(genre?: string | null): boolean {
  return genre === 'academic' || genre === 'professional'
}

function parseCanonLocks(raw?: string): CanonLockEntry[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item): item is CanonLockEntry => {
        if (!item || typeof item !== 'object') return false
        const row = item as Partial<CanonLockEntry>
        return typeof row.id === 'string' && typeof row.label === 'string' && typeof row.value === 'string'
      })
      .slice(0, 100)
  } catch {
    return []
  }
}

function parseGenreMeta(raw?: string): ReferencePackMeta {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as ReferencePackMeta
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function normalizeEntries(value: unknown, source: AiReferencePackEntry['source']): AiReferencePackEntry[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item, index): AiReferencePackEntry | null => {
      if (typeof item === 'string') {
        const trimmed = item.trim()
        return trimmed ? { id: `${source}-${index + 1}`, label: trimmed.slice(0, 80), value: trimmed, source } : null
      }
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const label = String(row.label || row.term || row.title || row.name || `条目 ${index + 1}`).trim()
      const valueText = String(row.value || row.definition || row.description || row.text || '').trim()
      if (!label || !valueText) return null
      return {
        id: String(row.id || `${source}-${index + 1}`),
        label,
        value: valueText,
        source
      }
    })
    .filter((item): item is AiReferencePackEntry => Boolean(item))
    .slice(0, REFERENCE_CAP)
}

function buildReferencePack(
  profile: AiWorkProfile | null | undefined,
  localCitations: Array<{ ref: string; sourceId: string; title?: string; excerpt: string; score?: number }>,
  canonLocks: CanonLockEntry[]
) {
  const meta = parseGenreMeta(profile?.genre_meta)
  const referenceMeta = meta.referencePack || meta
  const references = localCitations.slice(0, REFERENCE_CAP).map<AiReferencePackEntry>((citation) => ({
    id: citation.sourceId,
    label: citation.title || citation.ref,
    value: citation.excerpt,
    source: 'citation'
  }))
  const terminology = normalizeEntries(referenceMeta.terminology, 'genre_meta')
  const keyArguments = normalizeEntries(referenceMeta.keyArguments, 'genre_meta')
  const policies = normalizeEntries(referenceMeta.policies, 'genre_meta')

  if (terminology.length === 0 && keyArguments.length === 0 && canonLocks.length > 0) {
    return {
      references,
      terminology,
      keyArguments: canonLocks.slice(0, 30).map<AiReferencePackEntry>((lock) => ({
        id: lock.id,
        label: lock.label,
        value: lock.value,
        source: 'canon_pack_locks'
      })),
      policies
    }
  }

  return { references, terminology, keyArguments, policies }
}
