import { getDb } from './connection'

export function getAllCustomShortcuts(): Record<string, string> {
  const rows = getDb()
    .prepare('SELECT action, keys FROM custom_shortcuts')
    .all() as { action: string; keys: string }[]
  const out: Record<string, string> = {}
  for (const r of rows) {
    if (r.keys?.trim()) out[r.action] = r.keys.trim()
  }
  return out
}

export function upsertCustomShortcut(action: string, keys: string): void {
  const db = getDb()
  const trimmed = keys.trim()
  if (!trimmed) {
    db.prepare('DELETE FROM custom_shortcuts WHERE action = ?').run(action)
    return
  }
  db.prepare(
    `INSERT INTO custom_shortcuts (action, keys) VALUES (?, ?)
     ON CONFLICT(action) DO UPDATE SET keys = excluded.keys`
  ).run(action, trimmed)
}
