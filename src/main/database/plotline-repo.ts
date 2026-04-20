import { getDb } from './connection'

export function getPlotlines(bookId: number) {
  const db = getDb()
  return db.prepare('SELECT * FROM plotlines WHERE book_id = ? ORDER BY sort_order, id').all(bookId)
}

export function createPlotline(bookId: number, name: string, color: string) {
  const db = getDb()
  const row = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM plotlines WHERE book_id = ?').get(bookId) as {
    n: number
  }
  const sortOrder = row.n
  const result = db
    .prepare(
      `
    INSERT INTO plotlines (book_id, name, color, sort_order)
    VALUES (?, ?, ?, ?)
  `
    )
    .run(bookId, name, color, sortOrder)
  return db.prepare('SELECT * FROM plotlines WHERE id = ?').get(result.lastInsertRowid)
}

export function updatePlotline(id: number, name: string, color: string) {
  const db = getDb()
  db.prepare('UPDATE plotlines SET name = ?, color = ? WHERE id = ?').run(name, color, id)
}

export function deletePlotline(id: number) {
  const db = getDb()
  db.prepare('DELETE FROM plotlines WHERE id = ?').run(id)
}
