export type McpServerStatus = 'disabled' | 'enabled' | 'error'
export type McpAuditStatus = 'ok' | 'denied' | 'error'

export interface McpServer {
  id: number
  name: string
  command: string
  args: string[]
  status: McpServerStatus
  readonly: boolean
  created_at: string
  updated_at: string
}

export interface McpServerInput {
  id?: number
  name: string
  command?: string
  args?: string[]
  status?: McpServerStatus
}

export interface McpCanonLink {
  id: number
  server_id: number
  book_id: number
  scope: string
  readonly: boolean
  created_at: string
}

export interface McpAuditLog {
  id: number
  server_id: number | null
  book_id: number | null
  action: string
  status: McpAuditStatus
  detail: Record<string, unknown>
  created_at: string
}

export interface McpWriteRejectionInput {
  serverId?: number | null
  bookId?: number | null
  action: string
  detail?: Record<string, unknown>
}

export interface McpContextBridgeResult {
  version: 'canon-pack.v2'
  kind: 'canon'
  bookId: number
  readonly: true
  assets: {
    characters: Array<{ id: string; name: string; description?: string }>
    relations: Array<{ fromId: string; toId: string; kind: string; label?: string }>
    foreshadowings: Array<{ id: string; text: string; status: string }>
    plotNodes: Array<{ id: string; title: string; description?: string; chapterNumber?: number }>
    events: Array<{
      id: string
      title: string
      description?: string
      chapterNumber?: number
      eventType: 'plot' | 'character' | 'world' | 'foreshadow'
      importance: 'low' | 'normal' | 'high'
      relatedCharacterIds?: string[]
    }>
    organizations: Array<{
      id: string
      name: string
      description?: string
      parentId?: string
      orgType: 'group' | 'faction' | 'company' | 'department'
      memberIds?: string[]
    }>
  }
  provenance: {
    source: 'desktop-mcp-readonly'
    generatedAt: string
  }
}
