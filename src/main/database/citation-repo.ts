import { getDb } from './connection'

/**
 * DI-02 v1 — 学术题材作品的引文管理仓库
 *
 * 与已有 wiki / character / foreshadow 仓库语义独立, 引文条目 (citation)
 * 专门服务 academic 题材作品: 论文、专著、期刊、会议、网页、学位论文等。
 *
 * citekey 是 BibTeX 风格的引用键 (作者+年, 例如 zhang2024-mlmodel),
 * 同一作品下唯一; UI 端引文 picker 与 ai-drafts 'create_citation' kind
 * 都用 citekey 作为引用 anchor。
 *
 * 字段保持最大可填集合, 未用到的字段允许空串 (而不是 NULL), 避免每个
 * citation_type 都要建独立子表; 渲染参考文献时由前端按类型组合可见字段。
 */

export type CitationType =
  | 'book'
  | 'journal'
  | 'conference'
  | 'website'
  | 'thesis'
  | 'report'
  | 'other'

const ALLOWED_TYPES: CitationType[] = [
  'book',
  'journal',
  'conference',
  'website',
  'thesis',
  'report',
  'other'
]

const ALLOWED_FIELDS = [
  'citekey',
  'citation_type',
  'authors',
  'title',
  'year',
  'publisher',
  'journal',
  'volume',
  'issue',
  'pages',
  'doi',
  'url',
  'notes'
]

export function listCitations(bookId: number) {
  const db = getDb()
  return db
    .prepare('SELECT * FROM citations WHERE book_id = ? ORDER BY citekey ASC')
    .all(bookId)
}

export function getCitation(id: number) {
  const db = getDb()
  return db.prepare('SELECT * FROM citations WHERE id = ?').get(id)
}

export function getCitationByKey(bookId: number, citekey: string) {
  const db = getDb()
  return db
    .prepare('SELECT * FROM citations WHERE book_id = ? AND citekey = ?')
    .get(bookId, citekey)
}

export function createCitation(bookId: number, data: Record<string, unknown>) {
  const db = getDb()
  const citekey = String(data.citekey || '').trim()
  if (!citekey) throw new Error('citekey 不能为空')

  const citationType = String(data.citation_type || 'other')
  if (!ALLOWED_TYPES.includes(citationType as CitationType)) {
    throw new Error(`不支持的引文类型: ${citationType}`)
  }

  const exists = getCitationByKey(bookId, citekey)
  if (exists) throw new Error(`citekey "${citekey}" 在本作品下已存在`)

  const yearVal = data.year != null && data.year !== '' ? Number(data.year) : null
  const result = db
    .prepare(
      `
    INSERT INTO citations (
      book_id, citekey, citation_type, authors, title, year,
      publisher, journal, volume, issue, pages, doi, url, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
    )
    .run(
      bookId,
      citekey,
      citationType,
      String(data.authors || ''),
      String(data.title || ''),
      Number.isFinite(yearVal) ? yearVal : null,
      String(data.publisher || ''),
      String(data.journal || ''),
      String(data.volume || ''),
      String(data.issue || ''),
      String(data.pages || ''),
      String(data.doi || ''),
      String(data.url || ''),
      String(data.notes || '')
    )
  return db.prepare('SELECT * FROM citations WHERE id = ?').get(result.lastInsertRowid)
}

export function updateCitation(id: number, data: Record<string, unknown>) {
  const db = getDb()
  const fields: string[] = []
  const values: unknown[] = []

  for (const [key, val] of Object.entries(data)) {
    if (!ALLOWED_FIELDS.includes(key)) continue
    if (key === 'citation_type' && !ALLOWED_TYPES.includes(String(val) as CitationType)) {
      throw new Error(`不支持的引文类型: ${String(val)}`)
    }
    if (key === 'year') {
      const num = val != null && val !== '' ? Number(val) : null
      fields.push('year = ?')
      values.push(Number.isFinite(num) ? num : null)
    } else {
      fields.push(`${key} = ?`)
      values.push(typeof val === 'string' ? val : val == null ? '' : String(val))
    }
  }
  if (fields.length === 0) return getCitation(id)
  fields.push("updated_at = datetime('now','localtime')")
  values.push(id)
  db.prepare(`UPDATE citations SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  return getCitation(id)
}

export function deleteCitation(id: number) {
  const db = getDb()
  db.prepare('DELETE FROM citations WHERE id = ?').run(id)
}
