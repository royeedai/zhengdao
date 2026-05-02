import { describe, expect, it } from 'vitest'
import {
  SUBMISSION_GUIDE_PRESETS,
  buildGrowthShareText,
  buildGrowthSnapshotModel,
  buildSprintResultText,
  buildSubmissionChecklistText,
  buildSubmissionReadiness
} from '../author-growth'
import { buildPublishPackage } from '../publish-check'

describe('author growth utilities', () => {
  it('builds share text from statistics without manuscript content', () => {
    const model = buildGrowthSnapshotModel({
      todayWords: 3200,
      totalWords: 86000,
      chapterCount: 42,
      streakDays: 9,
      warningCount: 0,
      publishDangerCount: 0,
      publishWarningCount: 1
    })

    const text = buildGrowthShareText(model)

    expect(text).toContain('今日写作：3,200 字')
    expect(text).toContain('仅分享统计')
    expect(text).not.toContain('开篇内容')
  })

  it('summarizes sprint results as count-only public text', () => {
    const text = buildSprintResultText({
      targetWords: 2000,
      targetMinutes: 30,
      deltaWords: 1800,
      startedAt: new Date('2026-05-02T10:00:00Z'),
      finishedAt: new Date('2026-05-02T10:28:00Z')
    })

    expect(text).toContain('完成：1,800 字')
    expect(text).toContain('用时：28 分钟')
    expect(text).toContain('不包含正文')
  })

  it('turns publish checks into platform preparation blockers and suggestions', () => {
    const pkg = buildPublishPackage(
      'book',
      [
        { id: 1, title: '第一章', content: '<p>开篇</p>', word_count: 2 },
        { id: 2, title: '第二章', content: '', word_count: 0 }
      ],
      [],
      { lowWordThreshold: 100 }
    )
    const preset = SUBMISSION_GUIDE_PRESETS[0]!
    const readiness = buildSubmissionReadiness(pkg, preset)
    const checklist = buildSubmissionChecklistText(readiness, preset)

    expect(readiness.status).toBe('blocked')
    expect(readiness.safeSummary).toMatchObject({ wordCount: 2, chapterCount: 2 })
    expect(checklist).toContain('阻断项')
    expect(checklist).toContain('不在桌面端代投第三方账号')
  })
})
