import { getDb } from './connection'

export interface DailyStatRow {
  id: number
  book_id: number
  date: string
  word_count: number
}

export function getDailyStats(bookId: number, date: string) {
  const db = getDb()
  return db.prepare('SELECT * FROM daily_stats WHERE book_id = ? AND date = ?').get(bookId, date) || { word_count: 0 }
}

export function updateDailyStats(bookId: number, date: string, wordCount: number) {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM daily_stats WHERE book_id = ? AND date = ?').get(bookId, date)
  if (existing) {
    db.prepare('UPDATE daily_stats SET word_count = ? WHERE book_id = ? AND date = ?').run(wordCount, bookId, date)
  } else {
    db.prepare('INSERT INTO daily_stats (book_id, date, word_count) VALUES (?, ?, ?)').run(bookId, date, wordCount)
  }
}

export function getStatsRange(bookId: number, fromDate: string, toDate: string): DailyStatRow[] {
  const db = getDb()
  return db
    .prepare(
      `
    SELECT * FROM daily_stats
    WHERE book_id = ? AND date >= ? AND date <= ?
    ORDER BY date ASC
  `
    )
    .all(bookId, fromDate, toDate) as DailyStatRow[]
}

export interface AchievementStatsPayload {
  totalWords: number
  streak: number
  maxDailyWords: number
  totalDays: number
}

export function getAchievementStats(bookId: number): AchievementStatsPayload {
  const db = getDb()
  const tw = db
    .prepare(
      `
    SELECT COALESCE(SUM(c.word_count), 0) as total_words
    FROM chapters c
    JOIN volumes v ON v.id = c.volume_id AND v.deleted_at IS NULL
    WHERE v.book_id = ? AND c.deleted_at IS NULL
  `
    )
    .get(bookId) as { total_words: number }
  const rows = db
    .prepare('SELECT date, word_count FROM daily_stats WHERE book_id = ? ORDER BY date ASC')
    .all(bookId) as { date: string; word_count: number }[]

  let maxDailyWords = 0
  let totalDays = 0
  const map = new Map<string, number>()
  for (const r of rows) {
    map.set(r.date, r.word_count)
    if (r.word_count > 0) totalDays++
    if (r.word_count > maxDailyWords) maxDailyWords = r.word_count
  }

  const streak = computeUtcStreak(map)

  return {
    totalWords: Number(tw.total_words) || 0,
    streak,
    maxDailyWords,
    totalDays
  }
}

function utcDayKey(d: Date): string {
  return d.toISOString().split('T')[0]
}

function computeUtcStreak(byDate: Map<string, number>): number {
  let streak = 0
  const now = new Date()
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  for (let i = 0; i < 4000; i++) {
    const key = utcDayKey(d)
    const wc = byDate.get(key) ?? 0
    if (wc > 0) {
      streak++
      d.setUTCDate(d.getUTCDate() - 1)
    } else {
      break
    }
  }
  return streak
}

