import { getDb } from './connection'

export type SearchChapterHit = {
  id: number
  title: string
  snippet: string
  volume_title: string
  book_id: number
}

function buildFtsQuery(raw: string): string | null {
  const tokens = raw
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/"/g, '').trim())
    .filter(Boolean)
  if (tokens.length === 0) return null
  return tokens.map((t) => `"${t.replace(/"/g, '""')}"`).join(' AND ')
}

export class SearchRepo {
  searchChapters(query: string, bookId?: number): SearchChapterHit[] {
    const db = getDb()
    const fts = buildFtsQuery(query)
    if (!fts) return []

    try {
      const sql = bookId
        ? `
        SELECT c.id, c.title,
          snippet(chapters_fts, 1, '<mark class="fts-hit">', '</mark>', ' … ', 48) AS snippet,
          v.title AS volume_title,
          v.book_id AS book_id
        FROM chapters_fts
        JOIN chapters c ON c.id = chapters_fts.rowid
        JOIN volumes v ON v.id = c.volume_id
        WHERE chapters_fts MATCH ?
          AND v.book_id = ?
          AND c.deleted_at IS NULL
          AND v.deleted_at IS NULL
        ORDER BY bm25(chapters_fts)
        LIMIT 80
      `
        : `
        SELECT c.id, c.title,
          snippet(chapters_fts, 1, '<mark class="fts-hit">', '</mark>', ' … ', 48) AS snippet,
          v.title AS volume_title,
          v.book_id AS book_id
        FROM chapters_fts
        JOIN chapters c ON c.id = chapters_fts.rowid
        JOIN volumes v ON v.id = c.volume_id
        WHERE chapters_fts MATCH ?
          AND c.deleted_at IS NULL
          AND v.deleted_at IS NULL
        ORDER BY bm25(chapters_fts)
        LIMIT 80
      `
      const stmt = db.prepare(sql)
      const rows = bookId
        ? (stmt.all(fts, bookId) as SearchChapterHit[])
        : (stmt.all(fts) as SearchChapterHit[])
      return rows
    } catch {
      return []
    }
  }

  rebuildIndex(): void {
    getDb().exec(`INSERT INTO chapters_fts(chapters_fts) VALUES('rebuild')`)
  }
}
