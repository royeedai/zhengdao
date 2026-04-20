import { getDb } from './connection'

export function getNotes(bookId: number) {
  const db = getDb()
  return db.prepare('SELECT * FROM notes WHERE book_id = ? ORDER BY created_at DESC').all(bookId)
}

export function createNote(data: { book_id: number; content: string }) {
  const db = getDb()
  const result = db.prepare('INSERT INTO notes (book_id, content) VALUES (?, ?)').run(data.book_id, data.content)
  return db.prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid)
}

export function deleteNote(id: number) {
  const db = getDb()
  db.prepare('DELETE FROM notes WHERE id = ?').run(id)
}
