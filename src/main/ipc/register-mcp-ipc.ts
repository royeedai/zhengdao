import { ipcMain } from 'electron'
import {
  buildMcpCanonContext,
  deleteMcpServer,
  linkMcpServerToBook,
  listMcpAudit,
  listMcpLinks,
  listMcpServers,
  rejectMcpWriteRequest,
  saveMcpServer,
  unlinkMcpServerFromBook
} from '../mcp/mcp-service'
import type { McpServerInput, McpWriteRejectionInput } from '../../shared/mcp'

export function registerMcpIpc(): void {
  ipcMain.handle('mcp:listServers', () => listMcpServers())
  ipcMain.handle('mcp:saveServer', (_, input: McpServerInput) => saveMcpServer(input))
  ipcMain.handle('mcp:deleteServer', (_, id: number) => deleteMcpServer(id))
  ipcMain.handle('mcp:listLinks', (_, bookId?: number) => listMcpLinks(bookId))
  ipcMain.handle('mcp:linkCanon', (_, serverId: number, bookId: number, scope?: string) =>
    linkMcpServerToBook(serverId, bookId, scope)
  )
  ipcMain.handle('mcp:unlinkCanon', (_, linkId: number) => unlinkMcpServerFromBook(linkId))
  ipcMain.handle('mcp:listAudit', (_, bookId?: number, limit?: number) => listMcpAudit(bookId, limit))
  ipcMain.handle('mcp:buildCanonContext', (_, bookId: number) => buildMcpCanonContext(bookId))
  ipcMain.handle('mcp:rejectWriteRequest', (_, input: McpWriteRejectionInput) =>
    rejectMcpWriteRequest(input)
  )
}
