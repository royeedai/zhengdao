import { getDb } from './connection'

function safeJsonParse(value: unknown, fallback: Record<string, unknown> = {}): unknown {
  if (typeof value !== 'string' || !value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

export function getCharacters(bookId: number) {
  const db = getDb()
  const chars = db
    .prepare('SELECT * FROM characters WHERE book_id = ? AND deleted_at IS NULL ORDER BY created_at')
    .all(bookId)
  return chars.map((c: any) => ({
    ...c,
    custom_fields: safeJsonParse(c.custom_fields)
  }))
}

export function createCharacter(data: Record<string, unknown>) {
  const db = getDb()
  const customFields = JSON.stringify(data.custom_fields || {})
  const result = db.prepare(`
    INSERT INTO characters (book_id, name, faction, status, custom_fields, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    data.book_id, data.name,
    data.faction || 'neutral', data.status || 'active',
    customFields, data.description || ''
  )
  const row: any = db.prepare('SELECT * FROM characters WHERE id = ?').get(result.lastInsertRowid)
  return { ...row, custom_fields: safeJsonParse(row.custom_fields) }
}

export function updateCharacter(id: number, data: Record<string, unknown>) {
  const db = getDb()
  const fields: string[] = []
  const values: unknown[] = []
  for (const [key, val] of Object.entries(data)) {
    if (['name', 'faction', 'status', 'description', 'avatar_path'].includes(key)) {
      fields.push(`${key} = ?`)
      values.push(val)
    }
    if (key === 'custom_fields') {
      fields.push('custom_fields = ?')
      values.push(JSON.stringify(val))
    }
  }
  if (fields.length === 0) return
  fields.push("updated_at = datetime('now','localtime')")
  values.push(id)
  db.prepare(`UPDATE characters SET ${fields.join(', ')} WHERE id = ?`).run(...values)
}

export function deleteCharacter(id: number) {
  const db = getDb()
  db.prepare(`UPDATE characters SET deleted_at = datetime('now','localtime') WHERE id = ?`).run(id)
}

export function restoreCharacter(id: number) {
  const db = getDb()
  db.prepare('UPDATE characters SET deleted_at = NULL WHERE id = ?').run(id)
}

export function permanentlyDeleteCharacter(id: number) {
  const db = getDb()
  db.prepare('DELETE FROM characters WHERE id = ?').run(id)
}

export function getCharacterAppearances(characterId: number) {
  const db = getDb()
  return db.prepare(`
    SELECT ca.chapter_id, c.title as chapter_title, v.title as volume_title
    FROM character_appearances ca
    JOIN chapters c ON c.id = ca.chapter_id AND c.deleted_at IS NULL
    JOIN volumes v ON v.id = c.volume_id AND v.deleted_at IS NULL
    WHERE ca.character_id = ?
    ORDER BY v.sort_order, c.sort_order
  `).all(characterId)
}

export function getChapterAppearances(chapterId: number): number[] {
  const db = getDb()
  const rows = db
    .prepare('SELECT character_id FROM character_appearances WHERE chapter_id = ?')
    .all(chapterId) as { character_id: number }[]
  return rows.map((r) => r.character_id)
}

export function syncAppearances(chapterId: number, characterIds: number[]) {
  const db = getDb()
  const deleteStmt = db.prepare('DELETE FROM character_appearances WHERE chapter_id = ?')
  const insertStmt = db.prepare('INSERT OR IGNORE INTO character_appearances (character_id, chapter_id) VALUES (?, ?)')
  const txn = db.transaction(() => {
    deleteStmt.run(chapterId)
    for (const charId of characterIds) {
      insertStmt.run(charId, chapterId)
    }
  })
  txn()
}

export function getBookAppearances(bookId: number) {
  const db = getDb()
  return db
    .prepare(
      `
    SELECT ca.character_id, ca.chapter_id
    FROM character_appearances ca
    JOIN characters ch ON ch.id = ca.character_id AND ch.book_id = ? AND ch.deleted_at IS NULL
    JOIN chapters c ON c.id = ca.chapter_id AND c.deleted_at IS NULL
    JOIN volumes v ON v.id = c.volume_id AND v.book_id = ? AND v.deleted_at IS NULL
  `
    )
    .all(bookId, bookId) as { character_id: number; chapter_id: number }[]
}
