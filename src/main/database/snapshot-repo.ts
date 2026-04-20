import { getDb } from './connection'

export function createSnapshot(data: { chapter_id: number; content: string; word_count: number }) {
  const db = getDb()
  const result = db.prepare('INSERT INTO snapshots (chapter_id, content, word_count) VALUES (?, ?, ?)').run(data.chapter_id, data.content, data.word_count)
  return db.prepare('SELECT * FROM snapshots WHERE id = ?').get(result.lastInsertRowid)
}

export function getSnapshots(chapterId: number) {
  const db = getDb()
  return db.prepare('SELECT * FROM snapshots WHERE chapter_id = ? ORDER BY created_at DESC LIMIT 100').all(chapterId)
}

export function cleanOldSnapshots() {
  const db = getDb()
  // Keep all within 24h, 1 per hour for 1-7 days, 1 per day for older
  db.prepare(`
    DELETE FROM snapshots WHERE id NOT IN (
      SELECT id FROM snapshots WHERE created_at >= datetime('now', '-1 day', 'localtime')
      UNION
      SELECT MIN(id) FROM snapshots
        WHERE created_at >= datetime('now', '-7 days', 'localtime')
        AND created_at < datetime('now', '-1 day', 'localtime')
        GROUP BY chapter_id, strftime('%Y-%m-%d %H', created_at)
      UNION
      SELECT MIN(id) FROM snapshots
        WHERE created_at < datetime('now', '-7 days', 'localtime')
        GROUP BY chapter_id, strftime('%Y-%m-%d', created_at)
    )
  `).run()
}
