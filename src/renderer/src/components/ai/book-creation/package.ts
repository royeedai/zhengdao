import {
  normalizeCreationBrief,
  type AiBookCreationPackage,
  type AssistantCreationBrief
} from '../../../../../shared/ai-book-creation'
import { ensureHtmlContent } from '../ai-assistant-helpers'

/**
 * SPLIT-006 — book-creation package coercion + fallback + DB writer.
 *
 * The AI returns a "AiBookCreationPackage" (volumes / chapters /
 * characters / wiki / plot / foreshadow) but the shape is brittle —
 * model wraps it in `{ data: {...} }`, drops fields, returns a single
 * volume with no chapters, etc. These helpers deal with the noise:
 *   - `coerceBookCreationPackage`: unwraps any of the common envelopes.
 *   - `mergeBookCreationPackageWithFallback`: fills in missing fields
 *     from a deterministic fallback so the panel always has a renderable
 *     preview.
 *   - `buildFallbackBookCreationPackage`: deterministic skeleton built
 *     from the user's confirmed brief alone.
 *   - `createBookFromPackageThroughExistingApi`: legacy DB-write path
 *     used when the new `window.api.createBookFromAiPackage` IPC is not
 *     available (tier mismatch / older builds).
 */

export interface AiBookCreationResult {
  book?: { id: number }
  firstChapterId?: number | null
}

export function coerceBookCreationPackage(value: unknown): AiBookCreationPackage | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<AiBookCreationPackage>
  if (raw.book && Array.isArray(raw.volumes)) return raw as AiBookCreationPackage
  const wrapped = value as {
    package?: unknown
    bookPackage?: unknown
    book_creation_package?: unknown
    creationPackage?: unknown
    data?: unknown
    result?: unknown
  }
  if (wrapped.package && typeof wrapped.package === 'object')
    return wrapped.package as AiBookCreationPackage
  if (wrapped.bookPackage && typeof wrapped.bookPackage === 'object')
    return wrapped.bookPackage as AiBookCreationPackage
  if (wrapped.book_creation_package && typeof wrapped.book_creation_package === 'object') {
    return wrapped.book_creation_package as AiBookCreationPackage
  }
  if (wrapped.creationPackage && typeof wrapped.creationPackage === 'object') {
    return wrapped.creationPackage as AiBookCreationPackage
  }
  if (wrapped.data && typeof wrapped.data === 'object')
    return coerceBookCreationPackage(wrapped.data)
  if (wrapped.result && typeof wrapped.result === 'object')
    return coerceBookCreationPackage(wrapped.result)
  return null
}

export function mergeBookCreationPackageWithFallback(
  pkg: AiBookCreationPackage | null,
  fallback: AiBookCreationPackage
): AiBookCreationPackage {
  if (!pkg) return fallback
  const volumes = Array.isArray(pkg.volumes)
    ? pkg.volumes
        .map((volume, index) => ({
          title: String(volume?.title || fallback.volumes[index]?.title || `第${index + 1}卷`),
          chapters:
            Array.isArray(volume?.chapters) && volume.chapters.length > 0
              ? volume.chapters.map((chapter, chapterIndex) => ({
                  title: String(
                    chapter?.title ||
                      fallback.volumes[index]?.chapters[chapterIndex]?.title ||
                      `第${chapterIndex + 1}章`
                  ),
                  summary: String(
                    chapter?.summary ||
                      fallback.volumes[index]?.chapters[chapterIndex]?.summary ||
                      ''
                  ),
                  content: String(
                    chapter?.content ||
                      fallback.volumes[index]?.chapters[chapterIndex]?.content ||
                      ''
                  )
                }))
              : fallback.volumes[index]?.chapters || fallback.volumes[0].chapters
        }))
        .filter((volume) => volume.chapters.length > 0)
    : []

  return {
    book: {
      title: String(pkg.book?.title || fallback.book.title),
      author: String(pkg.book?.author || fallback.book.author || '')
    },
    workProfile: {
      ...fallback.workProfile,
      ...(pkg.workProfile || {})
    },
    volumes: volumes.length > 0 ? volumes : fallback.volumes,
    characters:
      Array.isArray(pkg.characters) && pkg.characters.length > 0 ? pkg.characters : fallback.characters,
    wikiEntries: Array.isArray(pkg.wikiEntries) ? pkg.wikiEntries : fallback.wikiEntries,
    plotNodes: Array.isArray(pkg.plotNodes) ? pkg.plotNodes : fallback.plotNodes,
    foreshadowings: Array.isArray(pkg.foreshadowings) ? pkg.foreshadowings : fallback.foreshadowings
  }
}

function pickFirstBriefPart(value: string | undefined, fallback: string): string {
  const first = String(value || '')
    .split(/[、,，/；;]/)
    .map((part) => part.trim())
    .find(Boolean)
  return first || fallback
}

function clampPlotScore(value: unknown): number {
  const score = Number(value)
  if (!Number.isFinite(score)) return 0
  return Math.max(-5, Math.min(5, Math.round(score)))
}

function resolveFallbackBookTitle(brief: AssistantCreationBrief): string {
  const title = String(brief.title || '').trim()
  if (title && !/AI 起名|暂定名|稍后改名/.test(title)) return title
  const genre = pickFirstBriefPart(brief.genreTheme, '新作品')
  if (genre.includes('现实')) return '平凡日子里的光'
  if (genre.includes('职场')) return '逆风向上'
  if (genre.includes('悬疑')) return '沉默的真相'
  return `${genre}新篇`
}

export function buildFallbackBookCreationPackage(
  briefInput: AssistantCreationBrief
): AiBookCreationPackage {
  const brief = normalizeCreationBrief(briefInput)
  const title = resolveFallbackBookTitle(brief)
  const genreTheme = brief.genreTheme || '让 AI 评估题材'
  const targetLength = brief.targetLength || '让 AI 评估篇幅'
  const chapterPlan = brief.chapterPlan || '按篇幅自动规划'
  const characterPlan = brief.characterPlan || '让 AI 写人物组'
  const style = brief.styleAudiencePlatform || '让 AI 评估平台'
  const world = brief.worldbuilding || '现实城市'
  const boundaries = brief.boundaries || '无明显禁区'
  const protagonist = characterPlan.includes('老王') ? '老王' : '主角'

  return {
    book: {
      title,
      author: brief.author || ''
    },
    workProfile: {
      productGenre: brief.productGenre || 'webnovel',
      styleGuide: style,
      genreRules: genreTheme,
      contentBoundaries: boundaries,
      assetRules: `人物方向：${characterPlan}`,
      rhythmRules: `篇幅：${targetLength}；章节：${chapterPlan}`
    },
    volumes: [
      {
        title: '第一卷',
        chapters: [
          {
            title: '第一章 开始',
            summary: `围绕${genreTheme}展开开篇，建立${protagonist}的现实处境、生活压力和主要矛盾。篇幅目标为${targetLength}，章节节奏暂按"${chapterPlan}"推进。`,
            content: ''
          }
        ]
      }
    ],
    characters: [
      {
        name: protagonist,
        faction: 'main',
        status: 'active',
        description: characterPlan
      }
    ],
    wikiEntries: [
      {
        category: '世界观',
        title: world,
        content: `初始设定方向：${world}`
      },
      {
        category: '创作边界',
        title: '内容边界',
        content: boundaries
      }
    ],
    plotNodes: [
      {
        chapterNumber: 1,
        title: '开篇处境',
        score: 1,
        nodeType: 'main',
        description: `建立${protagonist}的日常处境和核心矛盾。`
      },
      {
        chapterNumber: 1,
        title: '变化发生',
        score: 2,
        nodeType: 'main',
        description: '用一个明确事件推动故事进入主线。'
      }
    ],
    foreshadowings: [
      {
        text: '第一章埋下后续转折的线索。',
        expectedChapter: 3,
        expectedWordCount: null
      }
    ]
  }
}

export async function createBookFromPackageThroughExistingApi(
  briefInput: AssistantCreationBrief,
  pkg: AiBookCreationPackage
): Promise<AiBookCreationResult> {
  const brief = normalizeCreationBrief(briefInput)
  const book = (await window.api.createBook({
    title: String(pkg.book.title || brief.title || 'AI 新作品'),
    author: String(pkg.book.author || brief.author || '')
  })) as { id: number }
  if (!book?.id) throw new Error('创建作品失败：缺少作品 ID')

  if (typeof window.api.aiSaveWorkProfile === 'function') {
    await window.api.aiSaveWorkProfile(book.id, {
      genre: pkg.workProfile?.productGenre || brief.productGenre || 'webnovel',
      style_guide: pkg.workProfile?.styleGuide || '',
      genre_rules: pkg.workProfile?.genreRules || '',
      content_boundaries: pkg.workProfile?.contentBoundaries || '',
      asset_rules: pkg.workProfile?.assetRules || '',
      rhythm_rules: pkg.workProfile?.rhythmRules || ''
    })
  }

  let firstChapterId: number | null = null
  for (const [volumeIndex, volume] of pkg.volumes.entries()) {
    const createdVolume = (await window.api.createVolume({
      book_id: book.id,
      title: String(volume.title || `第${volumeIndex + 1}卷`)
    })) as { id: number }
    for (const [chapterIndex, chapter] of volume.chapters.entries()) {
      const createdChapter = (await window.api.createChapter({
        volume_id: createdVolume.id,
        title: String(chapter.title || `第${chapterIndex + 1}章`),
        content: ensureHtmlContent(String(chapter.content || '')),
        summary: String(chapter.summary || '')
      })) as { id: number }
      firstChapterId ??= createdChapter.id
    }
  }

  for (const character of pkg.characters) {
    await window.api.createCharacter({
      book_id: book.id,
      name: String(character.name || '未命名角色'),
      faction: character.faction || 'neutral',
      status: character.status || 'active',
      description: character.description || '',
      custom_fields: character.customFields || {}
    })
  }

  for (const [index, entry] of pkg.wikiEntries.entries()) {
    await window.api.createWikiEntry({
      book_id: book.id,
      category: entry.category || 'AI 设定',
      title: entry.title || '未命名设定',
      content: entry.content || '',
      sort_order: index
    })
  }

  for (const [index, node] of pkg.plotNodes.entries()) {
    await window.api.createPlotNode({
      book_id: book.id,
      chapter_number: Number.isFinite(Number(node.chapterNumber))
        ? Number(node.chapterNumber)
        : 0,
      title: node.title || '剧情节点',
      score: clampPlotScore(node.score),
      node_type: node.nodeType === 'branch' ? 'branch' : 'main',
      description: node.description || '',
      sort_order: index
    })
  }

  for (const item of pkg.foreshadowings) {
    await window.api.createForeshadowing({
      book_id: book.id,
      chapter_id: firstChapterId,
      text: item.text || 'AI 伏笔',
      expected_chapter: item.expectedChapter ?? null,
      expected_word_count: item.expectedWordCount ?? null
    })
  }

  return { book, firstChapterId }
}
