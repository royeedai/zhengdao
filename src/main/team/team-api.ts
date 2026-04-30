// DI-06 v2 — 桌面端团队 API 客户端
//
// 调用 agent.xiangweihu.com /v1/teams/* 路由, 使用证道账号 token (与
// official-ai-service / skill-execute-service 共享同一份 token 来源)。
//
// 所有方法返回 { ok, data?, error?, code? } 结构, IPC handler 把 ok=false
// 的情况转成业务字段, 桌面端 store 按 code 做 i18n。

import {
  deleteChapterLock,
  replaceTeamProjects,
  upsertChapterLock,
  upsertChapterReview,
  upsertTeamProject
} from '../database/collaboration-repo'
import type {
  ChapterLockMirror,
  ChapterReviewMirror,
  TeamApiResult,
  TeamInvitation,
  TeamInvitationRole,
  TeamMember,
  TeamProjectSummary,
  TeamRole,
  TeamSummary
} from '../../shared/team-collaboration'

const WEBSITE_URL = (process.env.ZHENGDAO_WEBSITE_URL || 'https://agent.xiangweihu.com').replace(/\/$/, '')
const API_BASE = (process.env.ZHENGDAO_API_URL || `${WEBSITE_URL}/api/v1`).replace(/\/$/, '')

async function apiRequest<T>(
  method: string,
  path: string,
  token: string | null,
  body?: unknown
): Promise<TeamApiResult<T>> {
  if (!token) return { ok: false, error: '请先登录证道账号', code: 'UNAUTHENTICATED' }
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      code: 'NETWORK_ERROR'
    }
  }

  const text = await response.text()
  let payload: Record<string, unknown> = {}
  if (text) {
    try {
      payload = JSON.parse(text) as Record<string, unknown>
    } catch {
      if (response.ok) {
        return { ok: false, error: '团队服务响应格式异常', code: 'BAD_RESPONSE' }
      }
    }
  }

  if (!response.ok) {
    const code = typeof payload.code === 'string' ? payload.code : `HTTP_${response.status}`
    const message =
      typeof payload.message === 'string'
        ? payload.message
        : `团队服务请求失败 (${response.status})`
    return { ok: false, error: message, code }
  }

  return { ok: true, data: payload as T }
}

export function listMyTeams(token: string | null) {
  return apiRequest<{ teams: TeamSummary[] }>('GET', '/teams', token)
}

export function createTeam(
  token: string | null,
  body: { name: string; plan?: string; seatLimit?: number }
) {
  return apiRequest<{ team: TeamSummary }>('POST', '/teams', token, body)
}

export function listTeamMembers(token: string | null, teamId: string) {
  return apiRequest<{ members: TeamMember[] }>('GET', `/teams/${encodeURIComponent(teamId)}/members`, token)
}

export function removeTeamMember(token: string | null, teamId: string, userId: string) {
  return apiRequest<{ ok: true }>(
    'DELETE',
    `/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(userId)}`,
    token
  )
}

export function listTeamInvitations(token: string | null, teamId: string) {
  return apiRequest<{ invitations: TeamInvitation[] }>(
    'GET',
    `/teams/${encodeURIComponent(teamId)}/invitations`,
    token
  )
}

export function createTeamInvitation(
  token: string | null,
  teamId: string,
  body: { email: string; role?: TeamInvitationRole; expiresInHours?: number }
) {
  return apiRequest<{ invitation: TeamInvitation }>(
    'POST',
    `/teams/${encodeURIComponent(teamId)}/invitations`,
    token,
    body
  )
}

export function revokeTeamInvitation(token: string | null, teamId: string, invitationId: string) {
  return apiRequest<{ ok: true }>(
    'DELETE',
    `/teams/${encodeURIComponent(teamId)}/invitations/${encodeURIComponent(invitationId)}`,
    token
  )
}

export function acceptInvitationByToken(token: string | null, invitationToken: string) {
  return apiRequest<{ team: TeamSummary; role: TeamRole }>(
    'POST',
    `/teams/invitations/${encodeURIComponent(invitationToken)}/accept`,
    token
  )
}

function normalizeProject(teamId: string, project: Record<string, unknown>): TeamProjectSummary {
  const projectId = typeof project.projectId === 'string'
    ? project.projectId
    : typeof project.id === 'string'
      ? project.id
      : ''
  return {
    id: projectId,
    name: typeof project.name === 'string' ? project.name : projectId,
    ownerUserId:
      typeof project.ownerUserId === 'string'
        ? project.ownerUserId
        : typeof project.linkedBy === 'string'
          ? project.linkedBy
          : '',
    linkedAt:
      typeof project.createdAt === 'string'
        ? project.createdAt
        : typeof project.linkedAt === 'string'
          ? project.linkedAt
          : undefined,
    updatedAt: typeof project.updatedAt === 'string' ? project.updatedAt : undefined
  }
}

function normalizeLock(teamId: string, projectId: string, chapterId: string, payload: unknown): ChapterLockMirror | null {
  if (!payload || typeof payload !== 'object') return null
  const record = payload as Record<string, unknown>
  const source = record.lock && typeof record.lock === 'object' ? record.lock as Record<string, unknown> : record
  const lockedBy = source.lockedBy
  const expiresAt = source.expiresAt
  if (typeof lockedBy !== 'string' || typeof expiresAt !== 'string') return null
  return { teamId, projectId, chapterId, lockedBy, expiresAt }
}

function normalizeReview(
  teamId: string,
  projectId: string,
  chapterId: string,
  payload: unknown
): ChapterReviewMirror | null {
  if (!payload || typeof payload !== 'object') return null
  const record = payload as Record<string, unknown>
  const source =
    record.review && typeof record.review === 'object'
      ? record.review as Record<string, unknown>
      : record.reviewRequest && typeof record.reviewRequest === 'object'
        ? record.reviewRequest as Record<string, unknown>
        : record
  const id = source.id
  const submittedBy = source.submittedBy
  const status = source.status
  const createdAt = source.createdAt
  const updatedAt = source.updatedAt
  if (
    typeof id !== 'string' ||
    typeof submittedBy !== 'string' ||
    (status !== 'pending' && status !== 'approved' && status !== 'rejected') ||
    typeof createdAt !== 'string' ||
    typeof updatedAt !== 'string'
  ) {
    return null
  }
  return {
    id,
    teamId,
    projectId,
    chapterId,
    submittedBy,
    status,
    reviewComments: typeof source.reviewComments === 'string' ? source.reviewComments : '',
    createdAt,
    updatedAt,
    decidedAt: typeof source.decidedAt === 'string' ? source.decidedAt : null
  }
}

export async function listTeamProjects(token: string | null, teamId: string) {
  const result = await apiRequest<{ projects: Array<Record<string, unknown>> }>(
    'GET',
    `/teams/${encodeURIComponent(teamId)}/projects`,
    token
  )
  if (result.ok) {
    const projects = (result.data?.projects || []).map((project) => normalizeProject(teamId, project))
    replaceTeamProjects(teamId, projects)
    return { ...result, data: { projects } }
  }
  return result as unknown as TeamApiResult<{ projects: TeamProjectSummary[] }>
}

export async function linkTeamProject(token: string | null, teamId: string, projectId: string) {
  const result = await apiRequest<{ project: Record<string, unknown> }>(
    'POST',
    `/teams/${encodeURIComponent(teamId)}/projects`,
    token,
    { projectId }
  )
  if (result.ok && result.data?.project) {
    const project = normalizeProject(teamId, result.data.project)
    upsertTeamProject(teamId, project)
    return { ...result, data: { project } }
  }
  return result as unknown as TeamApiResult<{ project: TeamProjectSummary }>
}

export async function getChapterLock(
  token: string | null,
  params: { teamId: string; projectId: string; chapterId: string }
) {
  const query = `teamId=${encodeURIComponent(params.teamId)}`
  const result = await apiRequest<unknown>(
    'GET',
    `/projects/${encodeURIComponent(params.projectId)}/chapters/${encodeURIComponent(params.chapterId)}/lock?${query}`,
    token
  )
  if (result.ok) {
    const lock = normalizeLock(params.teamId, params.projectId, params.chapterId, result.data)
    if (lock) upsertChapterLock(lock)
    return { ...result, data: { lock } }
  }
  return result as TeamApiResult<{ lock: ChapterLockMirror | null }>
}

export async function acquireChapterLock(
  token: string | null,
  params: { teamId: string; projectId: string; chapterId: string }
) {
  const result = await apiRequest<unknown>(
    'POST',
    `/projects/${encodeURIComponent(params.projectId)}/chapters/${encodeURIComponent(params.chapterId)}/lock`,
    token,
    { teamId: params.teamId }
  )
  if (result.ok) {
    const lock = normalizeLock(params.teamId, params.projectId, params.chapterId, result.data)
    if (lock) upsertChapterLock(lock)
    return { ...result, data: { lock } }
  }
  return result as TeamApiResult<{ lock: ChapterLockMirror | null }>
}

export async function releaseChapterLock(
  token: string | null,
  params: { teamId: string; projectId: string; chapterId: string }
) {
  const result = await apiRequest<{ ok: true }>(
    'DELETE',
    `/projects/${encodeURIComponent(params.projectId)}/chapters/${encodeURIComponent(params.chapterId)}/lock`,
    token,
    { teamId: params.teamId }
  )
  if (result.ok) deleteChapterLock(params.teamId, params.projectId, params.chapterId)
  return result
}

export async function getChapterReview(
  token: string | null,
  params: { teamId: string; projectId: string; chapterId: string }
) {
  const query = `teamId=${encodeURIComponent(params.teamId)}`
  const result = await apiRequest<unknown>(
    'GET',
    `/projects/${encodeURIComponent(params.projectId)}/chapters/${encodeURIComponent(params.chapterId)}/review-request?${query}`,
    token
  )
  if (result.ok) {
    const review = normalizeReview(params.teamId, params.projectId, params.chapterId, result.data)
    if (review) upsertChapterReview(review)
    return { ...result, data: { review } }
  }
  return result as TeamApiResult<{ review: ChapterReviewMirror | null }>
}

export async function submitChapterForReview(
  token: string | null,
  params: { teamId: string; projectId: string; chapterId: string }
) {
  const result = await apiRequest<unknown>(
    'POST',
    `/projects/${encodeURIComponent(params.projectId)}/chapters/${encodeURIComponent(params.chapterId)}/submit-for-review`,
    token,
    { teamId: params.teamId }
  )
  if (result.ok) {
    const review = normalizeReview(params.teamId, params.projectId, params.chapterId, result.data)
    if (review) upsertChapterReview(review)
    return { ...result, data: { review } }
  }
  return result as TeamApiResult<{ review: ChapterReviewMirror | null }>
}

export async function decideChapterReview(
  token: string | null,
  params: {
    teamId: string
    projectId: string
    chapterId: string
    reviewId: string
    decision: 'approved' | 'rejected'
    reviewComments?: string
  }
) {
  const result = await apiRequest<unknown>(
    'POST',
    `/projects/${encodeURIComponent(params.projectId)}/chapters/${encodeURIComponent(params.chapterId)}/review-decision`,
    token,
    {
      teamId: params.teamId,
      reviewId: params.reviewId,
      decision: params.decision,
      reviewComments: params.reviewComments
    }
  )
  if (result.ok) {
    const review = normalizeReview(params.teamId, params.projectId, params.chapterId, result.data)
    if (review) upsertChapterReview(review)
    return { ...result, data: { review } }
  }
  return result as TeamApiResult<{ review: ChapterReviewMirror | null }>
}
