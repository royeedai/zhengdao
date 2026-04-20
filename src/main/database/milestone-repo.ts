import { getDb } from './connection'

export function getMilestones(characterId: number) {
  const db = getDb()
  return db
    .prepare('SELECT * FROM character_milestones WHERE character_id = ? ORDER BY chapter_number, id')
    .all(characterId)
}

export function createMilestone(
  characterId: number,
  chapterNumber: number,
  label: string,
  value: string
) {
  const db = getDb()
  const result = db
    .prepare(
      `
    INSERT INTO character_milestones (character_id, chapter_number, label, value)
    VALUES (?, ?, ?, ?)
  `
    )
    .run(characterId, chapterNumber, label ?? '', value ?? '')
  return db.prepare('SELECT * FROM character_milestones WHERE id = ?').get(result.lastInsertRowid)
}

export function deleteMilestone(id: number) {
  const db = getDb()
  db.prepare('DELETE FROM character_milestones WHERE id = ?').run(id)
}
