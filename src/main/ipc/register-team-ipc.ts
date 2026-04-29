import { ipcMain } from 'electron'
import * as teamApi from '../team/team-api'
import { zhengdaoAuth } from './state'

/**
 * SPLIT-007 — team:* IPC handlers (DI-06 v2).
 *
 * Every call resolves the latest access token through zhengdaoAuth before
 * forwarding to the backend; no team data lives in the local SQLite, so
 * this module deliberately has no repo imports.
 */
export function registerTeamIpc(): void {
  ipcMain.handle('team:listMine', async () =>
    teamApi.listMyTeams(await zhengdaoAuth.getAccessToken())
  )
  ipcMain.handle(
    'team:create',
    async (_, body: { name: string; plan?: string; seatLimit?: number }) =>
      teamApi.createTeam(await zhengdaoAuth.getAccessToken(), body)
  )
  ipcMain.handle('team:listMembers', async (_, teamId: string) =>
    teamApi.listTeamMembers(await zhengdaoAuth.getAccessToken(), teamId)
  )
  ipcMain.handle('team:removeMember', async (_, teamId: string, userId: string) =>
    teamApi.removeTeamMember(await zhengdaoAuth.getAccessToken(), teamId, userId)
  )
  ipcMain.handle('team:listInvitations', async (_, teamId: string) =>
    teamApi.listTeamInvitations(await zhengdaoAuth.getAccessToken(), teamId)
  )
  ipcMain.handle(
    'team:createInvitation',
    async (
      _,
      teamId: string,
      body: { email: string; role?: 'admin' | 'member'; expiresInHours?: number }
    ) => teamApi.createTeamInvitation(await zhengdaoAuth.getAccessToken(), teamId, body)
  )
  ipcMain.handle('team:revokeInvitation', async (_, teamId: string, invitationId: string) =>
    teamApi.revokeTeamInvitation(await zhengdaoAuth.getAccessToken(), teamId, invitationId)
  )
  ipcMain.handle('team:acceptInvitation', async (_, invitationToken: string) =>
    teamApi.acceptInvitationByToken(await zhengdaoAuth.getAccessToken(), invitationToken)
  )
}
