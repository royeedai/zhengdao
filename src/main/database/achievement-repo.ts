import { getDb } from './connection'

export interface AchievementRow {
  id: number
  book_id: number
  type: string
  label: string
  unlocked_at: string
}

export function getAchievements(bookId: number): AchievementRow[] {
  const db = getDb()
  return db
    .prepare('SELECT * FROM achievements WHERE book_id = ? ORDER BY unlocked_at ASC')
    .all(bookId) as AchievementRow[]
}

export function getUnlockedAchievementTypes(bookId: number): string[] {
  const db = getDb()
  const rows = db.prepare('SELECT type FROM achievements WHERE book_id = ?').all(bookId) as { type: string }[]
  return rows.map((r) => r.type)
}

export function unlockAchievement(bookId: number, type: string, label: string): boolean {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM achievements WHERE book_id = ? AND type = ?').get(bookId, type)
  if (existing) return false
  db.prepare('INSERT INTO achievements (book_id, type, label) VALUES (?, ?, ?)').run(bookId, type, label)
  return true
}
