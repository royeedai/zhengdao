import type { PublishIssue, PublishPackage } from './publish-check'

export type AuthorGrowthTab = 'sprint' | 'weekly' | 'submission'
export type SubmissionReadinessStatus = 'ready' | 'draft' | 'blocked'

export interface GrowthSnapshotInput {
  todayWords: number
  totalWords: number
  chapterCount: number
  streakDays: number
  warningCount: number
  publishDangerCount: number
  publishWarningCount: number
  sprintCount?: number
  aiReviewCount?: number
}

export interface GrowthSnapshotModel extends GrowthSnapshotInput {
  publishReady: boolean
  shareStats: Array<{ label: string; value: string; tone: 'default' | 'success' | 'warning' | 'danger' }>
}

export interface SubmissionGuidePreset {
  id: string
  name: string
  minWords: number
  maxWords?: number
  sampleChapterCount: number
  notes: string[]
}

export interface SubmissionReadiness {
  status: SubmissionReadinessStatus
  statusLabel: string
  blockers: string[]
  warnings: string[]
  suggestions: string[]
  safeSummary: {
    wordCount: number
    chapterCount: number
    dangerIssueCount: number
    warningIssueCount: number
  }
}

export const SUBMISSION_GUIDE_PRESETS: SubmissionGuidePreset[] = [
  {
    id: 'general-longform',
    name: '长篇网文通用',
    minWords: 30000,
    maxWords: 300000,
    sampleChapterCount: 3,
    notes: ['准备简介、前三章、笔名和稳定更新计划', '先核对平台最新收稿方向和敏感规则']
  },
  {
    id: 'early-sample',
    name: '开篇样章评估',
    minWords: 8000,
    maxWords: 60000,
    sampleChapterCount: 3,
    notes: ['适合先整理前三章节奏和卖点', '重点检查空章、过短章节和敏感词']
  },
  {
    id: 'serial-ready',
    name: '连载发布准备',
    minWords: 50000,
    sampleChapterCount: 10,
    notes: ['适合准备稳定连载和日更承诺', '建议补齐大纲、存稿和发布节奏说明']
  }
]

export function buildGrowthSnapshotModel(input: GrowthSnapshotInput): GrowthSnapshotModel {
  const publishReady = input.publishDangerCount === 0
  return {
    ...input,
    publishReady,
    shareStats: [
      { label: '今日字数', value: `${input.todayWords.toLocaleString()} 字`, tone: input.todayWords > 0 ? 'success' : 'default' },
      { label: '总字数', value: `${input.totalWords.toLocaleString()} 字`, tone: 'default' },
      { label: '连续写作', value: `${input.streakDays} 天`, tone: input.streakDays >= 7 ? 'success' : 'default' },
      { label: '章节', value: `${input.chapterCount} 章`, tone: 'default' },
      { label: '伏笔风险', value: `${input.warningCount} 个`, tone: input.warningCount > 0 ? 'warning' : 'success' },
      {
        label: '发布检查',
        value: input.publishDangerCount > 0 ? `${input.publishDangerCount} 个阻断` : `${input.publishWarningCount} 个提醒`,
        tone: input.publishDangerCount > 0 ? 'danger' : input.publishWarningCount > 0 ? 'warning' : 'success'
      }
    ]
  }
}

export function buildGrowthShareText(model: GrowthSnapshotModel): string {
  return [
    '证道作者成长卡',
    `今日写作：${model.todayWords.toLocaleString()} 字`,
    `累计作品：${model.totalWords.toLocaleString()} 字 / ${model.chapterCount} 章`,
    `连续写作：${model.streakDays} 天`,
    `发布准备：${model.publishReady ? '可进入发布准备' : `${model.publishDangerCount} 个阻断待处理`}`,
    '仅分享统计，不包含正文、人物设定或 AI 草稿。'
  ].join('\n')
}

export function buildSprintResultText(input: {
  targetWords: number
  targetMinutes: number
  deltaWords: number
  startedAt: Date | null
  finishedAt: Date
}): string {
  const minutes = input.startedAt
    ? Math.max(1, Math.round((input.finishedAt.getTime() - input.startedAt.getTime()) / 60_000))
    : input.targetMinutes
  return [
    '证道写作冲刺',
    `目标：${input.targetWords.toLocaleString()} 字 / ${input.targetMinutes} 分钟`,
    `完成：${Math.max(0, input.deltaWords).toLocaleString()} 字`,
    `用时：${minutes} 分钟`,
    '仅分享统计，不包含正文。'
  ].join('\n')
}

export function buildSubmissionReadiness(
  publishPackage: PublishPackage,
  preset: SubmissionGuidePreset
): SubmissionReadiness {
  const dangerIssues = publishPackage.issues.filter((issue) => issue.severity === 'danger')
  const warningIssues = publishPackage.issues.filter((issue) => issue.severity === 'warning')
  const blockers = dangerIssues.map(formatIssue)
  const warnings = warningIssues.map(formatIssue)

  if (publishPackage.totalWords < preset.minWords) {
    blockers.push(`总字数低于「${preset.name}」建议：${publishPackage.totalWords.toLocaleString()} / ${preset.minWords.toLocaleString()} 字`)
  }
  if (preset.maxWords && publishPackage.totalWords > preset.maxWords) {
    warnings.push(`总字数高于该准备档位建议：${publishPackage.totalWords.toLocaleString()} / ${preset.maxWords.toLocaleString()} 字`)
  }
  if (publishPackage.chapters.length < preset.sampleChapterCount) {
    warnings.push(`样章数量不足：${publishPackage.chapters.length} / ${preset.sampleChapterCount} 章`)
  }

  const status: SubmissionReadinessStatus = blockers.length > 0 ? 'blocked' : warnings.length > 0 ? 'draft' : 'ready'
  return {
    status,
    statusLabel: status === 'ready' ? '可准备投稿' : status === 'draft' ? '可整理，仍有提醒' : '暂不建议投稿',
    blockers,
    warnings,
    suggestions: [
      ...preset.notes,
      '复制发布稿前再次确认平台最新公告、题材禁区和签约条款',
      '优先在社区投稿问答沉淀经验反馈，不在桌面端代投第三方账号'
    ],
    safeSummary: {
      wordCount: publishPackage.totalWords,
      chapterCount: publishPackage.chapters.length,
      dangerIssueCount: dangerIssues.length,
      warningIssueCount: warningIssues.length
    }
  }
}

export function buildSubmissionChecklistText(readiness: SubmissionReadiness, preset: SubmissionGuidePreset): string {
  const lines = [
    `投稿准备清单：${preset.name}`,
    `状态：${readiness.statusLabel}`,
    `统计：${readiness.safeSummary.wordCount.toLocaleString()} 字 / ${readiness.safeSummary.chapterCount} 章`
  ]
  if (readiness.blockers.length > 0) {
    lines.push('阻断项：', ...readiness.blockers.map((item) => `- ${item}`))
  }
  if (readiness.warnings.length > 0) {
    lines.push('提醒项：', ...readiness.warnings.map((item) => `- ${item}`))
  }
  lines.push('建议：', ...readiness.suggestions.map((item) => `- ${item}`))
  return lines.join('\n')
}

function formatIssue(issue: PublishIssue): string {
  return `${issue.chapterTitle}：${issue.message}`
}
