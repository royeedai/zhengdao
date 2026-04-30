import { getDb } from './connection'
import type {
  DirectorChapterCache,
  DirectorChapterStatus,
  DirectorRunLink,
  DirectorRunStatus,
  DirectorRemoteChapter
} from '../../shared/director'
import type { VisualAsset, VisualSkillId } from '../../shared/visual'
import { coerceGenre } from '../../shared/genre'

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function stringify(value: unknown): string {
  return JSON.stringify(value ?? {})
}

function mapRun(row: any): DirectorRunLink {
  return {
    ...row,
    genre: coerceGenre(row.genre),
    status: row.status as DirectorRunStatus
  }
}

function mapChapter(row: any): DirectorChapterCache {
  return {
    ...row,
    status: row.status as DirectorChapterStatus,
    metadata: parseJson(row.metadata, {})
  }
}

function mapVisualAsset(row: any): VisualAsset {
  return {
    ...row,
    skill_id: row.skill_id as VisualSkillId,
    status: row.status as VisualAsset['status'],
    metadata: parseJson(row.metadata, {})
  }
}

export function upsertDirectorRunLink(input: {
  bookId: number
  remoteRunId: string
  seed: string
  genre: string
  status?: DirectorRunStatus
}): DirectorRunLink {
  const db = getDb()
  db.prepare(
    `INSERT INTO director_run_links (book_id, remote_run_id, seed, genre, status)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(remote_run_id) DO UPDATE SET
       book_id = excluded.book_id,
       seed = excluded.seed,
       genre = excluded.genre,
       status = excluded.status,
       updated_at = datetime('now','localtime')`
  ).run(input.bookId, input.remoteRunId, input.seed, coerceGenre(input.genre), input.status ?? 'pending')
  return mapRun(db.prepare('SELECT * FROM director_run_links WHERE remote_run_id = ?').get(input.remoteRunId))
}

export function updateDirectorRunStatus(remoteRunId: string, status: DirectorRunStatus): DirectorRunLink | null {
  const db = getDb()
  db.prepare("UPDATE director_run_links SET status = ?, updated_at = datetime('now','localtime') WHERE remote_run_id = ?")
    .run(status, remoteRunId)
  const row = db.prepare('SELECT * FROM director_run_links WHERE remote_run_id = ?').get(remoteRunId)
  return row ? mapRun(row) : null
}

export function getDirectorRunLinkByRemoteId(remoteRunId: string): DirectorRunLink | null {
  const row = getDb().prepare('SELECT * FROM director_run_links WHERE remote_run_id = ?').get(remoteRunId)
  return row ? mapRun(row) : null
}

export function listDirectorRunLinks(bookId: number): DirectorRunLink[] {
  return getDb()
    .prepare('SELECT * FROM director_run_links WHERE book_id = ? ORDER BY updated_at DESC, id DESC')
    .all(bookId)
    .map(mapRun)
}

export function upsertDirectorChapterCache(runLinkId: number, chapter: DirectorRemoteChapter): DirectorChapterCache {
  const db = getDb()
  db.prepare(
    `INSERT INTO director_run_chapter_cache (
       director_run_link_id, remote_chapter_id, chapter_index, title, content, status, metadata
     ) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(director_run_link_id, remote_chapter_id) DO UPDATE SET
       chapter_index = excluded.chapter_index,
       title = excluded.title,
       content = excluded.content,
       status = excluded.status,
       metadata = excluded.metadata,
       updated_at = datetime('now','localtime')`
  ).run(
    runLinkId,
    chapter.id,
    chapter.chapterIndex,
    chapter.title,
    chapter.content,
    chapter.status,
    stringify(chapter.metadata)
  )
  return mapChapter(
    db
      .prepare(
        'SELECT * FROM director_run_chapter_cache WHERE director_run_link_id = ? AND remote_chapter_id = ?'
      )
      .get(runLinkId, chapter.id)
  )
}

export function listDirectorChapterCache(runLinkId: number): DirectorChapterCache[] {
  return getDb()
    .prepare(
      'SELECT * FROM director_run_chapter_cache WHERE director_run_link_id = ? ORDER BY chapter_index, id'
    )
    .all(runLinkId)
    .map(mapChapter)
}

export function insertVisualAssets(input: {
  bookId: number
  skillId: VisualSkillId
  remoteRunId: string
  provider: string
  candidates: Array<{
    url: string
    localPath?: string
    mimeType?: string
    sha256?: string
    fileSize?: number
    promptUsed?: string
    width?: number
    height?: number
    [key: string]: unknown
  }>
}): VisualAsset[] {
  const db = getDb()
  const insert = db.prepare(
    `INSERT INTO visual_assets (
       book_id, skill_id, remote_run_id, provider, url, local_path, mime_type, sha256, file_size,
       prompt_used, width, height, status, metadata
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'created', ?)`
  )
  const ids: number[] = []
  const tx = db.transaction(() => {
    for (const candidate of input.candidates) {
      const result = insert.run(
        input.bookId,
        input.skillId,
        input.remoteRunId,
        input.provider,
        candidate.url,
        candidate.localPath ?? '',
        candidate.mimeType ?? '',
        candidate.sha256 ?? '',
        candidate.fileSize ?? 0,
        candidate.promptUsed ?? '',
        candidate.width ?? 0,
        candidate.height ?? 0,
        stringify(candidate)
      )
      ids.push(Number(result.lastInsertRowid))
    }
  })
  tx()
  if (ids.length === 0) return []
  const placeholders = ids.map(() => '?').join(',')
  return db
    .prepare(`SELECT * FROM visual_assets WHERE id IN (${placeholders}) ORDER BY id`)
    .all(...ids)
    .map(mapVisualAsset)
}

export function listVisualAssets(bookId: number): VisualAsset[] {
  return getDb()
    .prepare('SELECT * FROM visual_assets WHERE book_id = ? ORDER BY created_at DESC, id DESC')
    .all(bookId)
    .map(mapVisualAsset)
}
