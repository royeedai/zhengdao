// 5 题材覆盖（real_all 路径）的共享类型，与 agentx-backend 对齐。
// 详见 .ai-os/lanes/portfolio-overhaul-2026q2 PRD GP-01。
//
// 注意：本类型是产品级"题材包"分类（决定 SYSTEM_PROMPT / Skill prompt / 草稿 kind 等 AI 行为），
// 与桌面端已有的 genre_templates 表（网文垂类 sub-genre：urban / xianxia 等）是两层概念，
// 可以共存：genre = 'webnovel' 时通常会再选 genre_template = 'urban' 或 'xianxia'。

export type Genre = 'webnovel' | 'script' | 'fiction' | 'academic' | 'professional'

export const GENRES: readonly Genre[] = ['webnovel', 'script', 'fiction', 'academic', 'professional'] as const

export const GENRE_LABELS: Record<Genre, string> = {
  webnovel: '网文',
  script: '剧本',
  fiction: '小说',
  academic: '学术',
  professional: '公文'
}

export const GENRE_DESCRIPTIONS: Record<Genre, string> = {
  webnovel: '网络文学：起点/番茄/晋江风格，强调爽点节奏与日更友好',
  script: '剧本：影视/短剧，强调叙事节拍/对白节奏/角色目标-行动-阻碍',
  fiction: '小说：文学创作，强调情感曲线、戏剧张力与文字精度',
  academic: '学术：论文/综述，强调论证强度、引用规范，允许 AI 协助代笔综述',
  professional: '公文：政府公文/咨询报告，强调政策对照与格式规范'
}

export const DEFAULT_GENRE: Genre = 'webnovel'

export function isGenre(value: unknown): value is Genre {
  return typeof value === 'string' && (GENRES as readonly string[]).includes(value)
}

export function coerceGenre(value: unknown): Genre {
  return isGenre(value) ? value : DEFAULT_GENRE
}
