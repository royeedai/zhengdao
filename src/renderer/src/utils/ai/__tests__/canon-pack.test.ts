import { describe, expect, it } from 'vitest'
import { buildDesktopCanonPack } from '../workflow/canon-pack'

describe('buildDesktopCanonPack — DI-07 Canon / Reference Pack v2 contract', () => {
  it('emits version canon-pack.v2 for fiction canon packs', () => {
    const pack = buildDesktopCanonPack({ bookId: 1 })
    expect(pack.version).toBe('canon-pack.v2')
    expect(pack.kind).toBe('canon')
    expect(pack.provenance.source).toBe('desktop-local')
    expect(pack.provenance.userConfirmedOnly).toBe(true)
  })

  it('omits relations / events / organizations when desktop has none (v0.1 compat)', () => {
    const pack = buildDesktopCanonPack({ bookId: 1 })
    expect(pack.assets.relations).toBeUndefined()
    expect(pack.assets.events).toBeUndefined()
    expect(pack.assets.organizations).toBeUndefined()
  })

  it('passes through relations with chapterRange + dynamic + label', () => {
    const pack = buildDesktopCanonPack({
      bookId: 1,
      relations: [
        {
          fromId: 10,
          toId: 11,
          kind: 'enemy',
          label: '世仇',
          chapterRange: [1, 50],
          dynamic: true
        }
      ]
    })
    expect(pack.assets.relations).toHaveLength(1)
    expect(pack.assets.relations?.[0]).toEqual({
      fromId: '10',
      toId: '11',
      kind: 'enemy',
      label: '世仇',
      chapterRange: [1, 50],
      dynamic: true
    })
  })

  it('caps relations at 100, events at 50, organizations at 30', () => {
    const relations = Array.from({ length: 150 }, (_, i) => ({
      fromId: i,
      toId: i + 1,
      kind: 'ally'
    }))
    const events = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      title: `事件 ${i}`,
      chapterNumber: i
    }))
    const organizations = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      name: `组织 ${i}`
    }))
    const pack = buildDesktopCanonPack({ bookId: 1, relations, events, organizations })
    expect(pack.assets.relations).toHaveLength(100)
    expect(pack.assets.events).toHaveLength(50)
    expect(pack.assets.organizations).toHaveLength(30)
  })

  it('coerces numeric IDs to strings and applies sane defaults for events / orgs', () => {
    const pack = buildDesktopCanonPack({
      bookId: 1,
      events: [{ id: 7, title: '主角觉醒' }],
      organizations: [{ id: 5, name: '青云宗' }]
    })
    expect(pack.assets.events?.[0]?.id).toBe('7')
    expect(pack.assets.events?.[0]?.eventType).toBe('plot')
    expect(pack.assets.events?.[0]?.importance).toBe('normal')
    expect(pack.assets.organizations?.[0]?.id).toBe('5')
    expect(pack.assets.organizations?.[0]?.orgType).toBe('group')
    expect(pack.assets.organizations?.[0]?.parentId).toBeUndefined()
  })

  it('keeps legacy v0.1 fields (characters / foreshadowings / plotNodes) intact', () => {
    const pack = buildDesktopCanonPack({
      bookId: 1,
      characters: [{ id: 1, name: '甲' }],
      foreshadowings: [{ id: 2, text: '伏笔', status: 'open' }],
      plotNodes: [{ id: 3, title: '节点', chapter_number: 5 }]
    })
    expect(pack.assets.characters).toHaveLength(1)
    expect(pack.assets.foreshadowings).toHaveLength(1)
    expect(pack.assets.plotNodes).toHaveLength(1)
    expect(pack.assets.plotNodes[0]?.chapterNumber).toBe(5)
  })

  it('builds Reference Pack v2 for academic works with v1 lock fallback', () => {
    const pack = buildDesktopCanonPack({
      bookId: 1,
      profile: {
        id: 1,
        book_id: 1,
        genre: 'academic',
        style_guide: '',
        genre_rules: '',
        content_boundaries: '',
        asset_rules: '',
        rhythm_rules: '',
        context_policy: 'smart_minimal',
        genre_meta: JSON.stringify({
          referencePack: {
            terminology: [{ term: 'RAG', definition: '检索增强生成' }],
            keyArguments: [{ title: '核心论点', text: '本研究比较本地优先与云端优先工作流。' }]
          }
        }),
        canon_pack_locks: JSON.stringify([
          {
            id: 'legacy-1',
            label: '旧版锁定论点',
            value: '保留 v1 markdown/locks 数据以便回滚',
            priority: 'high',
            createdAt: '2026-04-30T00:00:00.000Z'
          }
        ]),
        created_at: '',
        updated_at: ''
      },
      localCitations: [{ ref: 'L1', sourceId: 'smith2026', title: 'Smith 2026', excerpt: 'Local-first writing.' }]
    })

    expect(pack.kind).toBe('reference')
    expect(pack.assets.characters).toEqual([])
    expect(pack.assets.references?.[0]).toMatchObject({ id: 'smith2026', source: 'citation' })
    expect(pack.assets.terminology?.[0]?.label).toBe('RAG')
    expect(pack.assets.keyArguments?.[0]?.label).toBe('核心论点')
    expect(pack.assets.canonLocks?.[0]?.id).toBe('legacy-1')
  })

  it('falls back from v1 canon locks when Reference Pack v2 fields are absent', () => {
    const pack = buildDesktopCanonPack({
      bookId: 1,
      profile: {
        id: 1,
        book_id: 1,
        genre: 'professional',
        style_guide: '',
        genre_rules: '',
        content_boundaries: '',
        asset_rules: '',
        rhythm_rules: '',
        context_policy: 'smart_minimal',
        canon_pack_locks: JSON.stringify([
          {
            id: 'policy-1',
            label: '政策口径',
            value: '所有结论必须对应公开政策来源。',
            priority: 'critical',
            createdAt: '2026-04-30T00:00:00.000Z'
          }
        ]),
        created_at: '',
        updated_at: ''
      }
    })

    expect(pack.kind).toBe('reference')
    expect(pack.assets.keyArguments?.[0]).toMatchObject({
      id: 'policy-1',
      label: '政策口径',
      source: 'canon_pack_locks'
    })
  })
})
