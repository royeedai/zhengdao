import { describe, expect, it } from 'vitest'
import {
  DECONSTRUCT_SKILL_ID,
  MARKET_SCAN_SKILL_ID,
  buildDeconstructInput,
  buildMarketScanInput,
  buildReferenceApplicationPatch,
  collectDeconstructEvidence,
  hashDeconstructSource,
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
      focus: ['hook', 'retention'],
      analysisDepth: 'deep',
      platform: '番茄',
      genreTemplate: 'urban',
      learningGoal: '学习三章内钩子兑现',
      targetProject: {
        premise: '退婚后事业线反击',
        audience: '都市女强读者',
        currentProblem: '开篇留存偏弱'
      }
    })
    expect(ok.input?.focus).toEqual(['hook', 'retention'])
    expect(ok.input?.analysisDepth).toBe('deep')
    expect(ok.input?.platform).toBe('番茄')
    expect(ok.input?.targetProject).toMatchObject({ currentProblem: '开篇留存偏弱' })
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

  it('creates a stable source hash without adding raw text to report fields', () => {
    const built = buildDeconstructInput({
      projectId: 'book-9',
      sourceType: 'authorized_export',
      sourceNote: '作者授权导出的样章，仅用于本地拆文学习。',
      workTitle: '退婚样本',
      raw: ['### 第一章', '她被退婚后当众反击，系统提示音忽然响起。'.repeat(8)].join('\n'),
      focus: ['hook', 'craft']
    })

    expect(built.input).not.toBeNull()
    const first = hashDeconstructSource(built.input!)
    const second = hashDeconstructSource(built.input!)
    expect(first).toBe(second)
    expect(first).toMatch(/^local-[0-9a-f]{8}$/)
  })

  it('collects short evidence and builds a confirmed reference profile patch from selected craft cards', () => {
    const output = {
      craftCards: [
        {
          dimension: 'hook',
          observation: '开篇用公开羞辱制造压力。',
          whyItWorks: '即时冲突让读者知道主角必须反击。',
          adaptForOwnWork: '把主角的核心困境前置，并在同章给出可行动选择。',
          doNotCopy: '不要照搬退婚场景、台词或具体设定。',
          confidence: 0.82,
          evidence: [{ chapterId: 'c1', quote: '她被退婚后当众反击', reason: '开篇钩子' }]
        },
        {
          dimension: 'character',
          observation: '主角主动选择风险。',
          whyItWorks: '能动性降低被动等待感。',
          adaptForOwnWork: '让主角在压力下做出不可逆选择。',
          doNotCopy: '不要复制角色身份和关系。',
          confidence: 0.78,
          evidence: [{ chapterId: 'c2', quote: '她选择最危险的一条路', reason: '人物能动性' }]
        }
      ]
    }

    expect(collectDeconstructEvidence(output)).toHaveLength(2)
    const patch = buildReferenceApplicationPatch(output, [0], {
      genre_rules: '原有题材规则',
      rhythm_rules: '原有节奏规则'
    })
    expect(patch.genre_rules).toContain('原有题材规则')
    expect(patch.genre_rules).toContain('把主角的核心困境前置')
    expect(patch.genre_rules).toContain('不要照搬')
    expect(patch.rhythm_rules).toContain('开篇钩子')
    expect(patch.rhythm_rules).not.toContain('让主角在压力下做出不可逆选择')
  })
})
