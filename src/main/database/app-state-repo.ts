import { getDb } from './connection'

export function getAppState(key: string): string | null {
  const db = getDb()
  const row: any = db.prepare('SELECT value FROM app_state WHERE key = ?').get(key)
  return row ? row.value : null
}

export function setAppState(key: string, value: string) {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM app_state WHERE key = ?').get(key)
  if (existing) {
    db.prepare('UPDATE app_state SET value = ? WHERE key = ?').run(value, key)
  } else {
    db.prepare('INSERT INTO app_state (key, value) VALUES (?, ?)').run(key, value)
  }
}

export function deleteAppState(key: string) {
  const db = getDb()
  db.prepare('DELETE FROM app_state WHERE key = ?').run(key)
}
