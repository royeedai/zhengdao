import { getDb } from './connection'
import {
  applyForeshadowStatusChange,
  shouldAutoEscalateForeshadow,
  type ForeshadowStatus
} from './foreshadow-status'

export function getForeshadowings(bookId: number) {
  const db = getDb()
  return db.prepare(`
    SELECT f.*, c.title as chapter_title
    FROM foreshadowings f
    LEFT JOIN chapters c ON c.id = f.chapter_id AND c.deleted_at IS NULL
    WHERE f.book_id = ? AND f.deleted_at IS NULL
    ORDER BY f.created_at DESC
  `).all(bookId)
}

export function createForeshadowing(data: Record<string, unknown>) {
  const db = getDb()
  const result = db.prepare(`
    INSERT INTO foreshadowings (book_id, chapter_id, text, expected_chapter, expected_word_count)
    VALUES (?, ?, ?, ?, ?)
  `).run(data.book_id, data.chapter_id || null, data.text, data.expected_chapter || null, data.expected_word_count || null)
  return db.prepare('SELECT * FROM foreshadowings WHERE id = ?').get(result.lastInsertRowid)
}

export function updateForeshadowingStatus(id: number, status: ForeshadowStatus) {
  const db = getDb()
  const current = db
    .prepare('SELECT status, auto_suppressed FROM foreshadowings WHERE id = ?')
    .get(id) as { status: ForeshadowStatus; auto_suppressed?: number | null } | undefined
  if (!current) return

  const next = applyForeshadowStatusChange({
    currentStatus: current.status,
    nextStatus: status,
    currentAutoSuppressed: current.auto_suppressed
  })

  db.prepare('UPDATE foreshadowings SET status = ?, auto_suppressed = ? WHERE id = ?').run(
    next.status,
    next.auto_suppressed ?? 0,
    id
  )
}

export function deleteForeshadowing(id: number) {
  const db = getDb()
  db.prepare(`UPDATE foreshadowings SET deleted_at = datetime('now','localtime') WHERE id = ?`).run(id)
}

export function restoreForeshadowing(id: number) {
  const db = getDb()
  db.prepare('UPDATE foreshadowings SET deleted_at = NULL WHERE id = ?').run(id)
}

export function permanentlyDeleteForeshadowing(id: number) {
  const db = getDb()
  db.prepare('DELETE FROM foreshadowings WHERE id = ?').run(id)
}

export function checkForeshadowings(bookId: number, totalWords: number, currentChapter: number) {
  const db = getDb()
  const candidates = db
    .prepare(
      `
        SELECT id, status, auto_suppressed, expected_word_count, expected_chapter
        FROM foreshadowings
        WHERE book_id = ? AND status = 'pending' AND deleted_at IS NULL
      `
    )
    .all(bookId) as Array<{
    id: number
    status: ForeshadowStatus
    auto_suppressed?: number | null
    expected_word_count: number | null
    expected_chapter: number | null
  }>

  const updateStmt = db.prepare('UPDATE foreshadowings SET status = ?, auto_suppressed = ? WHERE id = ?')
  const txn = db.transaction(() => {
    for (const row of candidates) {
      if (!shouldAutoEscalateForeshadow(row)) continue
      const readyByWords = row.expected_word_count !== null && row.expected_word_count <= totalWords
      const readyByChapter = row.expected_chapter !== null && row.expected_chapter <= currentChapter
      if (!readyByWords && !readyByChapter) continue
      updateStmt.run('warning', 0, row.id)
    }
  })
  txn()
}
