import { getDb } from './connection'

export interface GenreTemplateRecord {
  id: number
  slug: string
  name: string
  character_fields: string
  faction_labels: string
  status_labels: string
  emotion_labels: string
  is_seed: number
  created_at: string
  updated_at: string
}

export interface GenreTemplateInput {
  name: string
  character_fields?: unknown[]
  faction_labels?: unknown[]
  status_labels?: unknown[]
  emotion_labels?: unknown[]
}

function safeJsonParse(value: unknown, fallback: unknown[] = []): unknown[] {
  if (typeof value !== 'string' || !value) return fallback
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

function mapRow(row: GenreTemplateRecord | undefined) {
  if (!row) return null
  return {
    ...row,
    character_fields: safeJsonParse(row.character_fields),
    faction_labels: safeJsonParse(row.faction_labels),
    status_labels: safeJsonParse(row.status_labels),
    emotion_labels: safeJsonParse(row.emotion_labels)
  }
}

function slugBase(name: string): string {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return normalized || 'genre-template'
}

function ensureUniqueSlug(base: string, excludeId?: number): string {
  const db = getDb()
  let slug = base
  let suffix = 2
  while (true) {
    const row = db
      .prepare('SELECT id FROM genre_templates WHERE slug = ?')
      .get(slug) as { id: number } | undefined
    if (!row || (excludeId !== undefined && row.id === excludeId)) return slug
    slug = `${base}-${suffix}`
    suffix += 1
  }
}

function serializeArray(value: unknown[] | undefined): string {
  return JSON.stringify(Array.isArray(value) ? value : [])
}

export function getGenreTemplates() {
  const db = getDb()
  const rows = db
    .prepare('SELECT * FROM genre_templates ORDER BY is_seed DESC, created_at ASC, id ASC')
    .all() as GenreTemplateRecord[]
  return rows.map((row) => mapRow(row))
}

export function getGenreTemplate(id: number) {
  const db = getDb()
  const row = db.prepare('SELECT * FROM genre_templates WHERE id = ?').get(id) as GenreTemplateRecord | undefined
  return mapRow(row)
}

export function createGenreTemplate(input: GenreTemplateInput) {
  const db = getDb()
  const base = ensureUniqueSlug(slugBase(input.name))
  const result = db.prepare(`
    INSERT INTO genre_templates (
      slug, name, character_fields, faction_labels, status_labels, emotion_labels, is_seed, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now','localtime'), datetime('now','localtime'))
  `).run(
    base,
    input.name.trim() || '未命名题材',
    serializeArray(input.character_fields),
    serializeArray(input.faction_labels),
    serializeArray(input.status_labels),
    serializeArray(input.emotion_labels)
  )
  return getGenreTemplate(Number(result.lastInsertRowid))
}

export function updateGenreTemplate(id: number, updates: Partial<GenreTemplateInput>) {
  const db = getDb()
  const current = db.prepare('SELECT * FROM genre_templates WHERE id = ?').get(id) as GenreTemplateRecord | undefined
  if (!current) return null

  db.prepare(`
    UPDATE genre_templates
    SET
      name = ?,
      character_fields = ?,
      faction_labels = ?,
      status_labels = ?,
      emotion_labels = ?,
      updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(
    (updates.name ?? current.name).trim() || current.name,
    updates.character_fields ? serializeArray(updates.character_fields) : current.character_fields,
    updates.faction_labels ? serializeArray(updates.faction_labels) : current.faction_labels,
    updates.status_labels ? serializeArray(updates.status_labels) : current.status_labels,
    updates.emotion_labels ? serializeArray(updates.emotion_labels) : current.emotion_labels,
    id
  )

  return getGenreTemplate(id)
}

export function copyGenreTemplate(id: number) {
  const current = getGenreTemplate(id)
  if (!current) return null
  return createGenreTemplate({
    name: `${current.name}（副本）`,
    character_fields: current.character_fields,
    faction_labels: current.faction_labels,
    status_labels: current.status_labels,
    emotion_labels: current.emotion_labels
  })
}

export function deleteGenreTemplate(id: number) {
  const db = getDb()
  const row = db.prepare('SELECT is_seed FROM genre_templates WHERE id = ?').get(id) as { is_seed: number } | undefined
  if (!row || row.is_seed) return false
  db.prepare('DELETE FROM genre_templates WHERE id = ?').run(id)
  return true
}
