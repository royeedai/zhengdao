import { getDb } from './connection'
import * as chapterRepo from './chapter-repo'
import * as characterRepo from './character-repo'
import * as foreshadowRepo from './foreshadow-repo'

export type TrashEntityKind = 'chapter' | 'volume' | 'character' | 'foreshadowing'

export type TrashChapterItem = {
  kind: 'chapter'
  id: number
  title: string
  deleted_at: string
  volume_title: string
}

export type TrashVolumeItem = {
  kind: 'volume'
  id: number
  title: string
  deleted_at: string
}

export type TrashCharacterItem = {
  kind: 'character'
  id: number
  name: string
  deleted_at: string
}

export type TrashForeshadowItem = {
  kind: 'foreshadowing'
  id: number
  text: string
  deleted_at: string
}

export type TrashBundle = {
  chapters: TrashChapterItem[]
  volumes: TrashVolumeItem[]
  characters: TrashCharacterItem[]
  foreshadowings: TrashForeshadowItem[]
}

export function getTrashItems(bookId: number): TrashBundle {
  const db = getDb()
  const chapterRows = db
    .prepare(
      `
    SELECT c.id, c.title, c.deleted_at, v.title AS volume_title
    FROM chapters c
    JOIN volumes v ON v.id = c.volume_id
    WHERE v.book_id = ? AND c.deleted_at IS NOT NULL
    ORDER BY c.deleted_at DESC
  `
    )
    .all(bookId) as Omit<TrashChapterItem, 'kind'>[]

  const volumeRows = db
    .prepare(
      `
    SELECT id, title, deleted_at
    FROM volumes
    WHERE book_id = ? AND deleted_at IS NOT NULL
    ORDER BY deleted_at DESC
  `
    )
    .all(bookId) as Omit<TrashVolumeItem, 'kind'>[]

  const characterRows = db
    .prepare(
      `
    SELECT id, name, deleted_at
    FROM characters
    WHERE book_id = ? AND deleted_at IS NOT NULL
    ORDER BY deleted_at DESC
  `
    )
    .all(bookId) as Omit<TrashCharacterItem, 'kind'>[]

  const foreshadowRows = db
    .prepare(
      `
    SELECT id, text, deleted_at
    FROM foreshadowings
    WHERE book_id = ? AND deleted_at IS NOT NULL
    ORDER BY deleted_at DESC
  `
    )
    .all(bookId) as Omit<TrashForeshadowItem, 'kind'>[]

  return {
    chapters: chapterRows.map((r) => ({ ...r, kind: 'chapter' as const })),
    volumes: volumeRows.map((r) => ({ ...r, kind: 'volume' as const })),
    characters: characterRows.map((r) => ({ ...r, kind: 'character' as const })),
    foreshadowings: foreshadowRows.map((r) => ({ ...r, kind: 'foreshadowing' as const }))
  }
}

export function restoreItem(kind: TrashEntityKind, id: number): void {
  if (kind === 'chapter') chapterRepo.restoreChapter(id)
  else if (kind === 'volume') chapterRepo.restoreVolume(id)
  else if (kind === 'character') characterRepo.restoreCharacter(id)
  else if (kind === 'foreshadowing') foreshadowRepo.restoreForeshadowing(id)
}

export function permanentDeleteItem(kind: TrashEntityKind, id: number): void {
  if (kind === 'chapter') chapterRepo.permanentlyDeleteChapter(id)
  else if (kind === 'volume') chapterRepo.permanentlyDeleteVolume(id)
  else if (kind === 'character') characterRepo.permanentlyDeleteCharacter(id)
  else if (kind === 'foreshadowing') foreshadowRepo.permanentlyDeleteForeshadowing(id)
}

export function emptyTrash(bookId: number): void {
  const db = getDb()
  const txn = db.transaction(() => {
    db.prepare(
      `
      DELETE FROM chapters
      WHERE deleted_at IS NOT NULL
        AND volume_id IN (SELECT id FROM volumes WHERE book_id = ? AND deleted_at IS NULL)
    `
    ).run(bookId)
    db.prepare(`DELETE FROM volumes WHERE book_id = ? AND deleted_at IS NOT NULL`).run(bookId)
    db.prepare(`DELETE FROM characters WHERE book_id = ? AND deleted_at IS NOT NULL`).run(bookId)
    db.prepare(`DELETE FROM foreshadowings WHERE book_id = ? AND deleted_at IS NOT NULL`).run(bookId)
  })
  txn()
}
