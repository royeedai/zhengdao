import { getDb } from './connection'

export function getWikiCategories(bookId: number) {
  const db = getDb()
  const rows: any[] = db.prepare('SELECT DISTINCT category FROM settings_wiki WHERE book_id = ? ORDER BY category').all(bookId)
  return rows.map((r) => r.category)
}

export function getWikiEntries(bookId: number, category: string) {
  const db = getDb()
  return db.prepare('SELECT * FROM settings_wiki WHERE book_id = ? AND category = ? ORDER BY sort_order').all(bookId, category)
}

export function createWikiEntry(data: Record<string, unknown>) {
  const db = getDb()
  const result = db.prepare(`
    INSERT INTO settings_wiki (book_id, category, title, content, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `).run(data.book_id, data.category || '', data.title, data.content || '', data.sort_order || 0)
  return db.prepare('SELECT * FROM settings_wiki WHERE id = ?').get(result.lastInsertRowid)
}

export function updateWikiEntry(id: number, data: Record<string, unknown>) {
  const db = getDb()
  const fields: string[] = []
  const values: unknown[] = []
  for (const [key, val] of Object.entries(data)) {
    if (['category', 'title', 'content', 'sort_order'].includes(key)) {
      fields.push(`${key} = ?`)
      values.push(val)
    }
  }
  if (fields.length === 0) return
  fields.push("updated_at = datetime('now','localtime')")
  values.push(id)
  db.prepare(`UPDATE settings_wiki SET ${fields.join(', ')} WHERE id = ?`).run(...values)
}

export function deleteWikiEntry(id: number) {
  const db = getDb()
  db.prepare('DELETE FROM settings_wiki WHERE id = ?').run(id)
}
