import { getDb } from '../database/connection'
import * as canonEventRepo from '../database/canon-event-repo'
import * as canonOrgRepo from '../database/canon-organization-repo'
import {
  appendAudit,
  deleteServer,
  linkServerToBook,
  listAudit,
  listLinks,
  listServers,
  saveServer,
  unlinkServerFromBook
} from '../database/mcp-repo'
import type { McpContextBridgeResult, McpServerInput, McpWriteRejectionInput } from '../../shared/mcp'

export function listMcpServers() {
  return listServers()
}

export function saveMcpServer(input: McpServerInput) {
  if (!input.name.trim()) throw new Error('mcp_server_name_required')
  const server = saveServer({ ...input, status: input.status || 'disabled' })
  appendAudit({
    serverId: server.id,
    action: input.id ? 'server.update' : 'server.create',
    detail: { readonly: true, status: server.status }
  })
  return server
}

export function deleteMcpServer(id: number) {
  deleteServer(id)
  appendAudit({ serverId: id, action: 'server.delete' })
  return { ok: true }
}

export function listMcpLinks(bookId?: number) {
  return listLinks(bookId)
}

export function linkMcpServerToBook(serverId: number, bookId: number, scope = 'canon_pack') {
  const link = linkServerToBook(serverId, bookId, scope)
  appendAudit({
    serverId,
    bookId,
    action: 'canon.link',
    detail: { scope, readonly: true }
  })
  return link
}

export function unlinkMcpServerFromBook(linkId: number) {
  unlinkServerFromBook(linkId)
  appendAudit({ action: 'canon.unlink', detail: { linkId } })
  return { ok: true }
}

export function listMcpAudit(bookId?: number, limit?: number) {
  return listAudit(bookId, limit)
}

export function rejectMcpWriteRequest(input: McpWriteRejectionInput) {
  const action = input.action.trim()
  if (!action) throw new Error('mcp_write_action_required')
  return appendAudit({
    serverId: input.serverId ?? null,
    bookId: input.bookId ?? null,
    action: `readonly.deny.${action}`,
    status: 'denied',
    detail: {
      ...(input.detail || {}),
      readonly: true,
      reason: 'mcp_runtime_is_readonly'
    }
  })
}

function readCharacters(bookId: number) {
  return getDb()
    .prepare('SELECT id, name, description FROM characters WHERE book_id = ? ORDER BY id ASC')
    .all(bookId) as Array<{ id: number; name: string; description?: string }>
}

function readRelations(bookId: number) {
  return getDb()
    .prepare(
      `SELECT source_id, target_id, relation_type, label
       FROM character_relations WHERE book_id = ? ORDER BY id ASC`
    )
    .all(bookId) as Array<{ source_id: number; target_id: number; relation_type: string; label?: string }>
}

function readForeshadowings(bookId: number) {
  return getDb()
    .prepare('SELECT id, text, status FROM foreshadowings WHERE book_id = ? ORDER BY id ASC')
    .all(bookId) as Array<{ id: number; text: string; status: string }>
}

function readPlotNodes(bookId: number) {
  return getDb()
    .prepare('SELECT id, title, description, chapter_number FROM plot_nodes WHERE book_id = ? ORDER BY sort_order ASC, id ASC')
    .all(bookId) as Array<{ id: number; title: string; description?: string; chapter_number?: number }>
}

function readOrgMemberships(bookId: number): Map<number, string[]> {
  const rows = getDb()
    .prepare(
      `SELECT cco.organization_id, cco.character_id
       FROM canon_character_organizations cco
       INNER JOIN characters c ON c.id = cco.character_id
       WHERE c.book_id = ?
       ORDER BY cco.organization_id, cco.character_id`
    )
    .all(bookId) as Array<{ organization_id: number; character_id: number }>
  const byOrg = new Map<number, string[]>()
  for (const row of rows) {
    const members = byOrg.get(row.organization_id) || []
    members.push(String(row.character_id))
    byOrg.set(row.organization_id, members)
  }
  return byOrg
}

export function buildMcpCanonContext(bookId: number): McpContextBridgeResult {
  const membershipByOrg = readOrgMemberships(bookId)
  const result: McpContextBridgeResult = {
    version: 'canon-pack.v2',
    kind: 'canon',
    bookId,
    readonly: true,
    assets: {
      characters: readCharacters(bookId).map((character) => ({
        id: String(character.id),
        name: character.name,
        description: character.description || undefined
      })),
      relations: readRelations(bookId).map((relation) => ({
        fromId: String(relation.source_id),
        toId: String(relation.target_id),
        kind: relation.relation_type,
        label: relation.label || undefined
      })),
      foreshadowings: readForeshadowings(bookId).map((item) => ({
        id: String(item.id),
        text: item.text,
        status: item.status
      })),
      plotNodes: readPlotNodes(bookId).map((node) => ({
        id: String(node.id),
        title: node.title,
        description: node.description || undefined,
        chapterNumber: node.chapter_number
      })),
      events: canonEventRepo.listByBookId(bookId).map((event) => ({
        id: String(event.id),
        title: event.title,
        description: event.description || undefined,
        chapterNumber: event.chapter_number ?? undefined,
        eventType: event.event_type,
        importance: event.importance,
        relatedCharacterIds: event.related_character_ids.map((id) => String(id))
      })),
      organizations: canonOrgRepo.listByBookId(bookId).map((org) => ({
        id: String(org.id),
        name: org.name,
        description: org.description || undefined,
        parentId: org.parent_id !== null ? String(org.parent_id) : undefined,
        orgType: org.org_type,
        memberIds: membershipByOrg.get(org.id)
      }))
    },
    provenance: {
      source: 'desktop-mcp-readonly',
      generatedAt: new Date().toISOString()
    }
  }
  appendAudit({
    bookId,
    action: 'context.read',
    detail: {
      readonly: true,
      characters: result.assets.characters.length,
      relations: result.assets.relations.length,
      events: result.assets.events.length,
      organizations: result.assets.organizations.length
    }
  })
  return result
}
