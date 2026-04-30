import { getDb } from './connection'
import type { McpAuditLog, McpAuditStatus, McpCanonLink, McpServer, McpServerInput } from '../../shared/mcp'

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function mapServer(row: any): McpServer {
  return {
    id: row.id,
    name: row.name,
    command: row.command || '',
    args: parseJson<string[]>(row.args, []),
    status: row.status,
    readonly: row.readonly === 1,
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

function mapLink(row: any): McpCanonLink {
  return {
    id: row.id,
    server_id: row.server_id,
    book_id: row.book_id,
    scope: row.scope,
    readonly: row.readonly === 1,
    created_at: row.created_at
  }
}

function mapAudit(row: any): McpAuditLog {
  return {
    id: row.id,
    server_id: row.server_id,
    book_id: row.book_id,
    action: row.action,
    status: row.status,
    detail: parseJson<Record<string, unknown>>(row.detail, {}),
    created_at: row.created_at
  }
}

export function listServers(): McpServer[] {
  return getDb()
    .prepare('SELECT * FROM mcp_servers ORDER BY updated_at DESC, id DESC')
    .all()
    .map(mapServer)
}

export function saveServer(input: McpServerInput): McpServer {
  const db = getDb()
  if (input.id) {
    db.prepare(
      `UPDATE mcp_servers
       SET name = ?, command = ?, args = ?, status = ?, readonly = 1, updated_at = datetime('now','localtime')
       WHERE id = ?`
    ).run(input.name.trim(), input.command || '', JSON.stringify(input.args || []), input.status || 'disabled', input.id)
    const updated = db.prepare('SELECT * FROM mcp_servers WHERE id = ?').get(input.id)
    if (!updated) throw new Error('mcp_server_not_found')
    return mapServer(updated)
  }

  const result = db.prepare(
    `INSERT INTO mcp_servers (name, command, args, status, readonly)
     VALUES (?, ?, ?, ?, 1)`
  ).run(input.name.trim(), input.command || '', JSON.stringify(input.args || []), input.status || 'disabled')
  return mapServer(db.prepare('SELECT * FROM mcp_servers WHERE id = ?').get(Number(result.lastInsertRowid)))
}

export function deleteServer(id: number): void {
  getDb().prepare('DELETE FROM mcp_servers WHERE id = ?').run(id)
}

export function linkServerToBook(serverId: number, bookId: number, scope = 'canon_pack'): McpCanonLink {
  const db = getDb()
  db.prepare(
    `INSERT INTO mcp_canon_links (server_id, book_id, scope, readonly)
     VALUES (?, ?, ?, 1)
     ON CONFLICT(server_id, book_id, scope) DO NOTHING`
  ).run(serverId, bookId, scope)
  const row = db
    .prepare('SELECT * FROM mcp_canon_links WHERE server_id = ? AND book_id = ? AND scope = ?')
    .get(serverId, bookId, scope)
  if (!row) throw new Error('mcp_link_create_failed')
  return mapLink(row)
}

export function unlinkServerFromBook(linkId: number): void {
  getDb().prepare('DELETE FROM mcp_canon_links WHERE id = ?').run(linkId)
}

export function listLinks(bookId?: number): McpCanonLink[] {
  const db = getDb()
  const rows = typeof bookId === 'number'
    ? db.prepare('SELECT * FROM mcp_canon_links WHERE book_id = ? ORDER BY id DESC').all(bookId)
    : db.prepare('SELECT * FROM mcp_canon_links ORDER BY id DESC').all()
  return rows.map(mapLink)
}

export function appendAudit(input: {
  serverId?: number | null
  bookId?: number | null
  action: string
  status?: McpAuditStatus
  detail?: Record<string, unknown>
}): McpAuditLog {
  const db = getDb()
  const result = db.prepare(
    `INSERT INTO mcp_audit_log (server_id, book_id, action, status, detail)
     VALUES (?, ?, ?, ?, ?)`
  ).run(input.serverId ?? null, input.bookId ?? null, input.action, input.status || 'ok', JSON.stringify(input.detail || {}))
  return mapAudit(db.prepare('SELECT * FROM mcp_audit_log WHERE id = ?').get(Number(result.lastInsertRowid)))
}

export function listAudit(bookId?: number, limit = 100): McpAuditLog[] {
  const db = getDb()
  const boundedLimit = Math.max(1, Math.min(limit, 500))
  const rows = typeof bookId === 'number'
    ? db
        .prepare('SELECT * FROM mcp_audit_log WHERE book_id = ? ORDER BY created_at DESC, id DESC LIMIT ?')
        .all(bookId, boundedLimit)
    : db.prepare('SELECT * FROM mcp_audit_log ORDER BY created_at DESC, id DESC LIMIT ?').all(boundedLimit)
  return rows.map(mapAudit)
}
