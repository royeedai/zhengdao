import { getDb } from './connection'

export interface ChapterTemplateRow {
  id: number
  book_id: number | null
  name: string
  content: string
  is_builtin: number
  created_at: string
}

export function getTemplates(bookId: number): ChapterTemplateRow[] {
  const db = getDb()
  return db
    .prepare(
      'SELECT * FROM chapter_templates WHERE book_id = ? ORDER BY created_at DESC'
    )
    .all(bookId) as ChapterTemplateRow[]
}

export function createTemplate(bookId: number, name: string, content: string): ChapterTemplateRow {
  const db = getDb()
  const result = db
    .prepare(
      'INSERT INTO chapter_templates (book_id, name, content, is_builtin) VALUES (?, ?, ?, 0)'
    )
    .run(bookId, name, content)
  return db.prepare('SELECT * FROM chapter_templates WHERE id = ?').get(result.lastInsertRowid) as ChapterTemplateRow
}

export function deleteTemplate(id: number): void {
  const db = getDb()
  db.prepare('DELETE FROM chapter_templates WHERE id = ? AND is_builtin = 0').run(id)
}
