import { getDb } from './connection'

export function getAnnotations(chapterId: number) {
  const db = getDb()
  return db.prepare('SELECT * FROM annotations WHERE chapter_id = ? ORDER BY id').all(chapterId)
}

export function createAnnotation(chapterId: number, textAnchor: string, content: string) {
  const db = getDb()
  const result = db
    .prepare('INSERT INTO annotations (chapter_id, text_anchor, content) VALUES (?, ?, ?)')
    .run(chapterId, textAnchor, content)
  return db.prepare('SELECT * FROM annotations WHERE id = ?').get(result.lastInsertRowid)
}

export function updateAnnotation(id: number, content: string) {
  const db = getDb()
  db.prepare('UPDATE annotations SET content = ? WHERE id = ?').run(content, id)
}

export function deleteAnnotation(id: number) {
  const db = getDb()
  db.prepare('DELETE FROM annotations WHERE id = ?').run(id)
}
