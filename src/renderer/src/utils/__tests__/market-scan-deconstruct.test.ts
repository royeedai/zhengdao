import { describe, expect, it } from 'vitest'
import {
  DECONSTRUCT_SKILL_ID,
  MARKET_SCAN_SKILL_ID,
  buildDeconstructInput,
  buildMarketScanInput,
  parseDeconstructChapters,
  parseMarketEntries,
  validateSourceNote
} from '../market-scan-deconstruct'

describe('market scan and deconstruct helpers', () => {
  it('keeps official skill IDs stable for the desktop modal', () => {
    expect(MARKET_SCAN_SKILL_ID).toBe('layer3.webnovel.market-scan')
    expect(DECONSTRUCT_SKILL_ID).toBe('layer3.webnovel.deconstruct')
  })

  it('parses market entries from JSON arrays', () => {
    const parsed = parseMarketEntries(
      JSON.stringify([
        { title: '灵气复苏后我开武馆', category: '都市高武', tags: ['系统', '高武'] },
        { title: '退婚后我成了制片人', category: '女强', tags: ['退婚', '事业线'] },
        { title: '末世避难所经营手册', category: '末世', tags: ['经营'] }
      ])
    )
    expect(parsed.errors).toEqual([])
    expect(parsed.value).toHaveLength(3)
    expect(parsed.value[0]).toMatchObject({ title: '灵气复苏后我开武馆', category: '都市高武' })
  })

  it('parses market entries from TSV with Chinese headers', () => {
    const parsed = parseMarketEntries(
      ['书名\t题材\t标签\t简介\t排名', '规则怪谈副本\t无限流\t规则怪谈|副本\t主角进入公寓副本\t1', '都市签到守夜人\t都市异能\t签到|系统\t夜班保安觉醒\t2', '先婚后爱爆红\t甜宠\t先婚后爱|热搜\t契约婚姻后直播爆红\t3'].join('\n')
    )
    expect(parsed.errors).toEqual([])
    expect(parsed.value[0]?.tags).toEqual(['规则怪谈', '副本'])
    expect(parsed.value[0]?.rank).toBe(1)
  })

  it('validates source note instead of accepting link-only provenance', () => {
    expect(validateSourceNote('www.example.com')).toBeTruthy()
    expect(validateSourceNote('作者本人手动粘贴的样本，可用于本地分析。')).toBeNull()
  })

  it('builds market scan input and rejects empty sample submission', () => {
    const ok = buildMarketScanInput({
      projectId: 12,
      sourceType: 'manual',
      sourceNote: '作者手动整理的授权样本，可用于内部题材分析。',
      raw: '书名\t题材\n灵气复苏后我开武馆\t都市\n末世避难所经营手册\t末世\n退婚后我成了制片人\t女强'
    })
    expect(ok.input?.projectId).toBe('12')
    expect(ok.input?.entries).toHaveLength(3)

    const empty = buildMarketScanInput({
      projectId: 12,
      sourceType: 'manual',
      sourceNote: '作者手动整理的授权样本，可用于内部题材分析。',
      raw: ''
    })
    expect(empty.input).toBeNull()
    expect(empty.errors.join('\n')).toContain('榜单样本')
  })

  it('parses authorized chapter samples from JSON and markdown headings', () => {
    const json = parseDeconstructChapters(
      JSON.stringify({
        chapters: [
          { id: 'c1', title: '退婚当日', order: 1, content: '她被退婚后当众反击。'.repeat(8) }
        ]
      })
    )
    expect(json.value[0]).toMatchObject({ id: 'c1', title: '退婚当日' })

    const markdown = parseDeconstructChapters(
      ['### 第一章 退婚', '她被当众羞辱，系统提示音忽然响起。'.repeat(6), '### 第二章 反击', '她回到旧仓库找到线索，新的消息突然出现。'.repeat(6)].join('\n')
    )
    expect(markdown.value).toHaveLength(2)
    expect(markdown.value[1]?.title).toBe('第二章 反击')
  })

  it('builds deconstruct input with focus and length validation', () => {
    const ok = buildDeconstructInput({
      projectId: 'book-9',
      sourceType: 'authorized_export',
      sourceNote: '作者授权导出的样章，仅用于本地拆文学习。',
      workTitle: '退婚样本',
      raw: ['### 第一章', '她被退婚后当众反击，系统提示音忽然响起。'.repeat(8)].join('\n'),
      focus: ['hook', 'retention']
    })
    expect(ok.input?.focus).toEqual(['hook', 'retention'])
    expect(ok.input?.chapters[0]?.id).toBe('sample-1')

    const bad = buildDeconstructInput({
      projectId: 'book-9',
      sourceType: 'manual',
      sourceNote: '作者授权导出的样章，仅用于本地拆文学习。',
      workTitle: '短样本',
      raw: '太短了'
    })
    expect(bad.input).toBeNull()
    expect(bad.errors.join('\n')).toContain('至少需要 80 字符')
  })
})

