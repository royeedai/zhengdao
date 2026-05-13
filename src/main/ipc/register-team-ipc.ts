import { ipcMain } from 'electron'
import * as teamApi from '../team/team-api'
import { zhengdaoAuth } from './state'
import type { TeamInvitationRole } from '../../shared/team-collaboration'

/**
 * SPLIT-007 — team:* IPC handlers (DI-06 v2).
 *
 * Every call resolves the latest access token through zhengdaoAuth before
 * forwarding to the backend. Project, lock, and review responses are also
 * mirrored by team-api so offline UI can show the last known collaboration
 * state without granting any local write path.
 */
export function registerTeamIpc(): void {
  ipcMain.handle('team:listMine', async () =>
    teamApi.listMyTeams(await zhengdaoAuth.getValidAccessToken())
  )
  ipcMain.handle(
    'team:create',
    async (_, body: { name: string; plan?: string; seatLimit?: number }) =>
      teamApi.createTeam(await zhengdaoAuth.getValidAccessToken(), body)
  )
  ipcMain.handle('team:listMembers', async (_, teamId: string) =>
    teamApi.listTeamMembers(await zhengdaoAuth.getValidAccessToken(), teamId)
  )
  ipcMain.handle('team:removeMember', async (_, teamId: string, userId: string) =>
    teamApi.removeTeamMember(await zhengdaoAuth.getValidAccessToken(), teamId, userId)
  )
  ipcMain.handle('team:listInvitations', async (_, teamId: string) =>
    teamApi.listTeamInvitations(await zhengdaoAuth.getValidAccessToken(), teamId)
  )
  ipcMain.handle(
    'team:createInvitation',
    async (
      _,
      teamId: string,
      body: { email: string; role?: TeamInvitationRole; expiresInHours?: number }
    ) => teamApi.createTeamInvitation(await zhengdaoAuth.getValidAccessToken(), teamId, body)
  )
  ipcMain.handle('team:revokeInvitation', async (_, teamId: string, invitationId: string) =>
    teamApi.revokeTeamInvitation(await zhengdaoAuth.getValidAccessToken(), teamId, invitationId)
  )
  ipcMain.handle('team:acceptInvitation', async (_, invitationToken: string) =>
    teamApi.acceptInvitationByToken(await zhengdaoAuth.getValidAccessToken(), invitationToken)
  )
  ipcMain.handle('team:listProjects', async (_, teamId: string) =>
    teamApi.listTeamProjects(await zhengdaoAuth.getValidAccessToken(), teamId)
  )
  ipcMain.handle('team:linkProject', async (_, teamId: string, projectId: string) =>
    teamApi.linkTeamProject(await zhengdaoAuth.getValidAccessToken(), teamId, projectId)
  )
  ipcMain.handle(
    'team:getChapterLock',
    async (_, params: { teamId: string; projectId: string; chapterId: string }) =>
      teamApi.getChapterLock(await zhengdaoAuth.getValidAccessToken(), params)
  )
  ipcMain.handle(
    'team:acquireChapterLock',
    async (_, params: { teamId: string; projectId: string; chapterId: string }) =>
      teamApi.acquireChapterLock(await zhengdaoAuth.getValidAccessToken(), params)
  )
  ipcMain.handle(
    'team:releaseChapterLock',
    async (_, params: { teamId: string; projectId: string; chapterId: string }) =>
      teamApi.releaseChapterLock(await zhengdaoAuth.getValidAccessToken(), params)
  )
  ipcMain.handle(
    'team:getChapterReview',
    async (_, params: { teamId: string; projectId: string; chapterId: string }) =>
      teamApi.getChapterReview(await zhengdaoAuth.getValidAccessToken(), params)
  )
  ipcMain.handle(
    'team:submitChapterForReview',
    async (_, params: { teamId: string; projectId: string; chapterId: string }) =>
      teamApi.submitChapterForReview(await zhengdaoAuth.getValidAccessToken(), params)
  )
  ipcMain.handle(
    'team:decideChapterReview',
    async (
      _,
      params: {
        teamId: string
        projectId: string
        chapterId: string
        reviewId: string
        decision: 'approved' | 'rejected'
        reviewComments?: string
      }
    ) => teamApi.decideChapterReview(await zhengdaoAuth.getValidAccessToken(), params)
  )
}
