import { getDb } from '../database/connection'
import * as chapterRepo from '../database/chapter-repo'
import * as configRepo from '../database/config-repo'
import * as characterRepo from '../database/character-repo'
import * as plotRepo from '../database/plot-repo'
import * as notesRepo from '../database/notes-repo'
import * as wikiRepo from '../database/wiki-repo'

export function exportBookPayload(bookId: number): Record<string, unknown> {
  const db = getDb()

  const bookRow = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId) as Record<string, unknown> | undefined
  if (!bookRow) throw new Error(`Book ${bookId} not found`)

  const volumes = chapterRepo.getVolumesWithChapters(bookId)
  const config = configRepo.getConfig(bookId)
  const characters = characterRepo.getCharacters(bookId)
  const plotNodes = plotRepo.getPlotNodes(bookId)

  const foreshadowingsRaw = db
    .prepare(`SELECT * FROM foreshadowings WHERE book_id = ? AND deleted_at IS NULL`)
    .all(bookId)

  const categories = wikiRepo.getWikiCategories(bookId)
  const wikiEntries: Record<string, unknown[]> = {}
  for (const cat of categories) {
    wikiEntries[cat] = wikiRepo.getWikiEntries(bookId, cat)
  }

  const notes = notesRepo.getNotes(bookId)
  const dailyStats = db.prepare('SELECT * FROM daily_stats WHERE book_id = ? ORDER BY date').all(bookId)

  const appearances = db.prepare(`
    SELECT ca.character_id, ca.chapter_id
    FROM character_appearances ca
    INNER JOIN characters ch ON ch.id = ca.character_id AND ch.book_id = ? AND ch.deleted_at IS NULL
    INNER JOIN chapters c ON c.id = ca.chapter_id AND c.deleted_at IS NULL
    INNER JOIN volumes v ON v.id = c.volume_id AND v.book_id = ? AND v.deleted_at IS NULL
  `).all(bookId, bookId)

  const snapshots = db.prepare(`
    SELECT s.*
    FROM snapshots s
    INNER JOIN chapters c ON c.id = s.chapter_id AND c.deleted_at IS NULL
    INNER JOIN volumes v ON v.id = c.volume_id AND v.book_id = ? AND v.deleted_at IS NULL
    ORDER BY s.created_at DESC
  `).all(bookId)

  return {
    export_version: 1,
    exported_at: new Date().toISOString(),
    book: bookRow,
    project_config: config,
    volumes,
    characters,
    plot_nodes: plotNodes,
    foreshadowings: foreshadowingsRaw,
    wiki_categories: categories,
    wiki_entries: wikiEntries,
    notes,
    daily_stats: dailyStats,
    character_appearances: appearances,
    snapshots
  }
}
