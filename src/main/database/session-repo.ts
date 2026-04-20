import { getDb } from './connection'

export interface WritingSessionRow {
  id: number
  book_id: number
  started_at: string
  ended_at: string | null
  word_count: number
}

export function createSession(bookId: number): { id: number; started_at: string } {
  const db = getDb()
  const r = db.prepare('INSERT INTO writing_sessions (book_id) VALUES (?)').run(bookId)
  const id = Number(r.lastInsertRowid)
  const row = db.prepare('SELECT started_at FROM writing_sessions WHERE id = ?').get(id) as { started_at: string }
  return { id, started_at: row.started_at }
}

export function endSession(sessionId: number, wordCount: number): void {
  const db = getDb()
  db.prepare(
    `UPDATE writing_sessions SET ended_at = datetime('now','localtime'), word_count = ? WHERE id = ?`
  ).run(wordCount, sessionId)
}

export function getSessionsToday(bookId: number): WritingSessionRow[] {
  const db = getDb()
  const today = db.prepare(`SELECT date('now','localtime') as d`).get() as { d: string }
  return db
    .prepare(
      `
    SELECT * FROM writing_sessions
    WHERE book_id = ? AND substr(started_at, 1, 10) = ?
    ORDER BY started_at ASC
  `
    )
    .all(bookId, today.d) as WritingSessionRow[]
}
