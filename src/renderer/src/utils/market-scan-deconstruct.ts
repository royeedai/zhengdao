export const MARKET_SCAN_SKILL_ID = 'layer3.webnovel.market-scan'
export const DECONSTRUCT_SKILL_ID = 'layer3.webnovel.deconstruct'

export type WebnovelSourceType = 'manual' | 'authorized_export'
export type DeconstructFocus = 'hook' | 'pacing' | 'trope' | 'character' | 'retention'

export interface MarketScanEntryDraft {
  title: string
  author?: string
  platform?: string
  category?: string
  tags?: string[]
  synopsis?: string
  rank?: number
}

export interface DeconstructChapterDraft {
  id: string
  title: string
  order: number
  content: string
}

export interface MarketScanSkillInput {
  projectId: string
  sourceType: WebnovelSourceType
  sourceNote: string
  datasetName?: string
  entries: MarketScanEntryDraft[]
}

export interface DeconstructSkillInput {
  projectId: string
  sourceType: WebnovelSourceType
  sourceNote: string
  workTitle: string
  chapters: DeconstructChapterDraft[]
  focus: DeconstructFocus[]
}

export interface ParseResult<T> {
  value: T
  errors: string[]
}

export interface BuildResult<T> {
  input: T | null
  errors: string[]
}

const TITLE_ALIASES = ['title', '书名', '标题', '作品名', 'name']
const AUTHOR_ALIASES = ['author', '作者']
const PLATFORM_ALIASES = ['platform', '平台', 'source']
const CATEGORY_ALIASES = ['category', '分类', '题材', 'genre']
const TAG_ALIASES = ['tags', 'tag', '标签', '关键词']
const SYNOPSIS_ALIASES = ['synopsis', 'summary', '简介', '梗概', '说明']
const RANK_ALIASES = ['rank', '排名', '榜位']

export function validateSourceNote(note: string): string | null {
  const trimmed = note.trim()
  if (trimmed.length < 10) return '请填写至少 10 个字符的数据来源/授权说明。'
  if (looksLikeLocatorOnly(trimmed)) return '来源说明不能只是一条链接或站点地址。'
  return null
}

export function parseMarketEntries(raw: string): ParseResult<MarketScanEntryDraft[]> {
  const text = raw.trim()
  if (!text) return { value: [], errors: ['请粘贴手动整理或授权导出的榜单样本。'] }

  const json = tryParseJson(text)
  if (json.ok) return normalizeMarketJson(json.value)

  return normalizeMarketDelimited(text)
}

export function parseDeconstructChapters(raw: string): ParseResult<DeconstructChapterDraft[]> {
  const text = raw.trim()
  if (!text) return { value: [], errors: ['请粘贴已授权章节样本。'] }

  const json = tryParseJson(text)
  if (json.ok) return normalizeChapterJson(json.value)

  return normalizeChapterText(text)
}

export function buildMarketScanInput(params: {
  projectId: string | number
  sourceType: WebnovelSourceType
  sourceNote: string
  datasetName?: string
  raw: string
}): BuildResult<MarketScanSkillInput> {
  const errors: string[] = []
  const sourceError = validateSourceNote(params.sourceNote)
  if (sourceError) errors.push(sourceError)

  const parsed = parseMarketEntries(params.raw)
  errors.push(...parsed.errors)
  if (parsed.value.length < 3) errors.push('扫榜分析至少需要 3 条样本。')

  const entries = parsed.value.filter((entry) => entry.title.trim())
  if (entries.length !== parsed.value.length) errors.push('每条榜单样本都必须包含标题。')

  if (errors.length > 0) return { input: null, errors: uniqueErrors(errors) }
  return {
    input: {
      projectId: String(params.projectId),
      sourceType: params.sourceType,
      sourceNote: params.sourceNote.trim(),
      datasetName: params.datasetName?.trim() || undefined,
      entries
    },
    errors: []
  }
}

export function buildDeconstructInput(params: {
  projectId: string | number
  sourceType: WebnovelSourceType
  sourceNote: string
  workTitle: string
  raw: string
  focus?: DeconstructFocus[]
}): BuildResult<DeconstructSkillInput> {
  const errors: string[] = []
  const sourceError = validateSourceNote(params.sourceNote)
  if (sourceError) errors.push(sourceError)
  if (!params.workTitle.trim()) errors.push('请填写样本作品名或内部标识。')

  const parsed = parseDeconstructChapters(params.raw)
  errors.push(...parsed.errors)
  if (parsed.value.length < 1) errors.push('拆文分析至少需要 1 章授权样本。')

  const totalChars = parsed.value.reduce((sum, chapter) => sum + chapter.content.length, 0)
  if (totalChars > 60000) errors.push('授权样本总长度不能超过 60000 字符。')
  parsed.value.forEach((chapter, index) => {
    if (chapter.content.length < 80) errors.push(`第 ${index + 1} 章样本文本过短，至少需要 80 字符。`)
    if (chapter.content.length > 15000) errors.push(`第 ${index + 1} 章样本文本超过 15000 字符。`)
  })

  const focus: DeconstructFocus[] =
    params.focus && params.focus.length > 0 ? params.focus : ['hook', 'pacing', 'trope', 'retention']
  if (errors.length > 0) return { input: null, errors: uniqueErrors(errors) }
  return {
    input: {
      projectId: String(params.projectId),
      sourceType: params.sourceType,
      sourceNote: params.sourceNote.trim(),
      workTitle: params.workTitle.trim(),
      chapters: parsed.value,
      focus
    },
    errors: []
  }
}

export function formatReferenceDraft(value: unknown): string {
  if (value == null) return ''
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function normalizeMarketJson(value: unknown): ParseResult<MarketScanEntryDraft[]> {
  const rows = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.entries)
      ? value.entries
      : null
  if (!rows) return { value: [], errors: ['JSON 必须是数组，或包含 entries 数组。'] }
  return normalizeMarketRows(rows)
}

function normalizeMarketDelimited(text: string): ParseResult<MarketScanEntryDraft[]> {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length === 0) return { value: [], errors: ['榜单样本为空。'] }

  const delimiter = lines[0]?.includes('\t') ? '\t' : ','
  const firstColumns = splitDelimited(lines[0] ?? '', delimiter)
  const headerMode = firstColumns.some((column) => isKnownMarketHeader(column))
  const headers = headerMode
    ? firstColumns.map((column) => normalizeHeader(column))
    : ['title', 'category', 'tags', 'synopsis', 'rank']
  const dataLines = headerMode ? lines.slice(1) : lines

  const rows = dataLines.map((line) => {
    const columns = splitDelimited(line, delimiter)
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = columns[index]?.trim() ?? ''
    })
    return row
  })
  return normalizeMarketRows(rows)
}

function normalizeMarketRows(rows: unknown[]): ParseResult<MarketScanEntryDraft[]> {
  const errors: string[] = []
  const entries = rows
    .map((row, index) => {
      if (!isRecord(row)) {
        errors.push(`第 ${index + 1} 条样本不是对象。`)
        return null
      }
      const title = readAlias(row, TITLE_ALIASES)
      if (!title) {
        errors.push(`第 ${index + 1} 条样本缺少标题。`)
        return null
      }
      return compactEntry({
        title,
        author: readAlias(row, AUTHOR_ALIASES),
        platform: readAlias(row, PLATFORM_ALIASES),
        category: readAlias(row, CATEGORY_ALIASES),
        tags: parseTags(readAliasOrValue(row, TAG_ALIASES)),
        synopsis: readAlias(row, SYNOPSIS_ALIASES),
        rank: parsePositiveInt(readAliasOrValue(row, RANK_ALIASES))
      })
    })
    .filter((entry): entry is MarketScanEntryDraft => entry !== null)
  return { value: entries, errors: uniqueErrors(errors) }
}

function normalizeChapterJson(value: unknown): ParseResult<DeconstructChapterDraft[]> {
  const rows = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.chapters)
      ? value.chapters
      : null
  if (!rows) return { value: [], errors: ['JSON 必须是章节数组，或包含 chapters 数组。'] }

  const errors: string[] = []
  const chapters = rows
    .map((row, index) => {
      if (!isRecord(row)) {
        errors.push(`第 ${index + 1} 章不是对象。`)
        return null
      }
      const content = readAlias(row, ['content', '正文', 'text'])
      if (!content) {
        errors.push(`第 ${index + 1} 章缺少正文。`)
        return null
      }
      return {
        id: readAlias(row, ['id', 'chapterId', '章节ID']) || `sample-${index + 1}`,
        title: readAlias(row, ['title', '章节标题', '标题']) || `样本章节 ${index + 1}`,
        order: parsePositiveInt(readAliasOrValue(row, ['order', 'sortOrder', '序号'])) ?? index,
        content
      }
    })
    .filter((chapter): chapter is DeconstructChapterDraft => chapter !== null)
    .sort((a, b) => a.order - b.order)
  return { value: chapters, errors: uniqueErrors(errors) }
}

function normalizeChapterText(text: string): ParseResult<DeconstructChapterDraft[]> {
  const headingSegments = splitMarkdownHeadingSegments(text)
  const blocks = headingSegments.length > 0 ? headingSegments : splitPlainChapterBlocks(text)
  const chapters = blocks.map((block, index) => {
    const lines = block.trim().split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    const first = lines[0] ?? `样本章节 ${index + 1}`
    const firstLooksLikeTitle = first.length <= 60 && lines.length > 1
    const title = firstLooksLikeTitle ? first.replace(/^#{1,6}\s*/, '') : `样本章节 ${index + 1}`
    const content = (firstLooksLikeTitle ? lines.slice(1).join('\n') : lines.join('\n')).trim()
    return { id: `sample-${index + 1}`, title, order: index, content }
  })
  return { value: chapters.filter((chapter) => chapter.content), errors: [] }
}

function splitMarkdownHeadingSegments(text: string): string[] {
  const lines = text.split(/\r?\n/)
  const segments: string[] = []
  let current: string[] = []
  let foundHeading = false
  for (const line of lines) {
    if (/^#{1,6}\s+\S+/.test(line.trim())) {
      if (current.length > 0) segments.push(current.join('\n'))
      current = [line]
      foundHeading = true
    } else {
      current.push(line)
    }
  }
  if (current.length > 0) segments.push(current.join('\n'))
  return foundHeading ? segments.filter((segment) => segment.trim()) : []
}

function splitPlainChapterBlocks(text: string): string[] {
  const blocks = text.split(/\n\s*(?:---+|={3,})\s*\n/g).filter((block) => block.trim())
  return blocks.length > 0 ? blocks : [text]
}

function splitDelimited(line: string, delimiter: string): string[] {
  if (delimiter === '\t') return line.split('\t')
  return line.split(',').map((column) => column.trim().replace(/^"|"$/g, ''))
}

function isKnownMarketHeader(column: string): boolean {
  const header = normalizeHeader(column)
  return [
    ...TITLE_ALIASES,
    ...AUTHOR_ALIASES,
    ...PLATFORM_ALIASES,
    ...CATEGORY_ALIASES,
    ...TAG_ALIASES,
    ...SYNOPSIS_ALIASES,
    ...RANK_ALIASES
  ].some((alias) => normalizeHeader(alias) === header)
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase()
}

function readAlias(row: Record<string, unknown>, aliases: string[]): string {
  const value = readAliasOrValue(row, aliases)
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim()
}

function readAliasOrValue(row: Record<string, unknown>, aliases: string[]): unknown {
  const entries = Object.entries(row)
  for (const alias of aliases) {
    const found = entries.find(([key]) => normalizeHeader(key) === normalizeHeader(alias))
    if (found) return found[1]
  }
  return undefined
}

function parseTags(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const tags = value.map((tag) => String(tag).trim()).filter(Boolean)
    return tags.length > 0 ? tags : undefined
  }
  if (typeof value !== 'string') return undefined
  const tags = value
    .split(/[|,，、]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
  return tags.length > 0 ? tags : undefined
}

function parsePositiveInt(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.floor(value)
  if (typeof value !== 'string') return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function compactEntry(entry: MarketScanEntryDraft): MarketScanEntryDraft {
  return {
    title: entry.title.trim(),
    ...(entry.author?.trim() ? { author: entry.author.trim() } : {}),
    ...(entry.platform?.trim() ? { platform: entry.platform.trim() } : {}),
    ...(entry.category?.trim() ? { category: entry.category.trim() } : {}),
    ...(entry.tags && entry.tags.length > 0 ? { tags: entry.tags } : {}),
    ...(entry.synopsis?.trim() ? { synopsis: entry.synopsis.trim() } : {}),
    ...(entry.rank ? { rank: entry.rank } : {})
  }
}

function tryParseJson(value: string): { ok: true; value: unknown } | { ok: false } {
  if (!value.startsWith('{') && !value.startsWith('[')) return { ok: false }
  try {
    return { ok: true, value: JSON.parse(value) }
  } catch {
    return { ok: false }
  }
}

function looksLikeLocatorOnly(value: string): boolean {
  const locator = /\b[a-z][a-z0-9+.-]*:\/\/|www\.|^[\w.-]+\.[a-z]{2,}(?:\/\S*)?$/i
  return locator.test(value.trim()) && value.trim().split(/\s+/).length <= 2
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function uniqueErrors(errors: string[]): string[] {
  return Array.from(new Set(errors))
}
