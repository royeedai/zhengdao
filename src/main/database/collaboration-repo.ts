import { getDb } from './connection'
import type { ChapterLockMirror, ChapterReviewMirror, TeamProjectSummary } from '../../shared/team-collaboration'

function mapProject(row: any): TeamProjectSummary {
  return {
    id: row.project_id,
    name: row.name || '',
    ownerUserId: row.owner_user_id || '',
    linkedAt: row.linked_at,
    updatedAt: row.updated_at
  }
}

function mapLock(row: any): ChapterLockMirror {
  return {
    teamId: row.team_id,
    projectId: row.project_id,
    chapterId: row.chapter_id,
    lockedBy: row.locked_by || '',
    expiresAt: row.expires_at || ''
  }
}

function mapReview(row: any): ChapterReviewMirror {
  return {
    id: row.review_id,
    teamId: row.team_id,
    projectId: row.project_id,
    chapterId: row.chapter_id,
    submittedBy: row.submitted_by || '',
    status: row.status,
    reviewComments: row.review_comments || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    decidedAt: row.decided_at
  }
}

export function upsertTeamProject(teamId: string, project: TeamProjectSummary): void {
  getDb()
    .prepare(
      `INSERT INTO team_project_links (team_id, project_id, name, owner_user_id, linked_at)
       VALUES (?, ?, ?, ?, COALESCE(?, datetime('now','localtime')))
       ON CONFLICT(team_id, project_id) DO UPDATE SET
         name = excluded.name,
         owner_user_id = excluded.owner_user_id,
         linked_at = excluded.linked_at,
         updated_at = datetime('now','localtime')`
    )
    .run(teamId, project.id, project.name || '', project.ownerUserId || '', project.linkedAt || null)
}

export function replaceTeamProjects(teamId: string, projects: TeamProjectSummary[]): void {
  const db = getDb()
  const tx = db.transaction(() => {
    for (const project of projects) upsertTeamProject(teamId, project)
  })
  tx()
}

export function listMirroredTeamProjects(teamId: string): TeamProjectSummary[] {
  return getDb()
    .prepare('SELECT * FROM team_project_links WHERE team_id = ? ORDER BY updated_at DESC, id DESC')
    .all(teamId)
    .map(mapProject)
}

export function upsertChapterLock(lock: ChapterLockMirror): void {
  getDb()
    .prepare(
      `INSERT INTO chapter_lock_mirrors (team_id, project_id, chapter_id, locked_by, expires_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(team_id, project_id, chapter_id) DO UPDATE SET
         locked_by = excluded.locked_by,
         expires_at = excluded.expires_at,
         updated_at = datetime('now','localtime')`
    )
    .run(lock.teamId, lock.projectId, lock.chapterId, lock.lockedBy, lock.expiresAt)
}

export function deleteChapterLock(teamId: string, projectId: string, chapterId: string): void {
  getDb()
    .prepare('DELETE FROM chapter_lock_mirrors WHERE team_id = ? AND project_id = ? AND chapter_id = ?')
    .run(teamId, projectId, chapterId)
}

export function getMirroredChapterLock(
  teamId: string,
  projectId: string,
  chapterId: string
): ChapterLockMirror | null {
  const row = getDb()
    .prepare('SELECT * FROM chapter_lock_mirrors WHERE team_id = ? AND project_id = ? AND chapter_id = ?')
    .get(teamId, projectId, chapterId)
  return row ? mapLock(row) : null
}

export function upsertChapterReview(review: ChapterReviewMirror): void {
  getDb()
    .prepare(
      `INSERT INTO chapter_review_mirrors (
         review_id, team_id, project_id, chapter_id, submitted_by, status,
         review_comments, created_at, updated_at, decided_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(review_id) DO UPDATE SET
         submitted_by = excluded.submitted_by,
         status = excluded.status,
         review_comments = excluded.review_comments,
         updated_at = excluded.updated_at,
         decided_at = excluded.decided_at`
    )
    .run(
      review.id,
      review.teamId,
      review.projectId,
      review.chapterId,
      review.submittedBy,
      review.status,
      review.reviewComments || '',
      review.createdAt,
      review.updatedAt,
      review.decidedAt || null
    )
}

export function getMirroredChapterReview(
  teamId: string,
  projectId: string,
  chapterId: string
): ChapterReviewMirror | null {
  const row = getDb()
    .prepare(
      `SELECT * FROM chapter_review_mirrors
       WHERE team_id = ? AND project_id = ? AND chapter_id = ?
       ORDER BY updated_at DESC, id DESC LIMIT 1`
    )
    .get(teamId, projectId, chapterId)
  return row ? mapReview(row) : null
}
