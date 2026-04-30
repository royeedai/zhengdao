import { useCallback, useEffect, useState } from 'react'
import { DatabaseZap, Link2, Loader2, Plus, ServerCog, Trash2, X } from 'lucide-react'
import { useBookStore } from '@/stores/book-store'
import { useToastStore } from '@/stores/toast-store'
import { useUIStore } from '@/stores/ui-store'
import type { McpAuditLog, McpCanonLink, McpContextBridgeResult, McpServer } from '../../../../shared/mcp'

export default function McpSettingsModal() {
  const closeModal = useUIStore((s) => s.closeModal)
  const bookId = useBookStore((s) => s.currentBookId)
  const addToast = useToastStore((s) => s.addToast)
  const [servers, setServers] = useState<McpServer[]>([])
  const [links, setLinks] = useState<McpCanonLink[]>([])
  const [audit, setAudit] = useState<McpAuditLog[]>([])
  const [contextPreview, setContextPreview] = useState<McpContextBridgeResult | null>(null)
  const [name, setName] = useState('')
  const [command, setCommand] = useState('')
  const [args, setArgs] = useState('')
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    const [nextServers, nextLinks, nextAudit] = await Promise.all([
      window.api.mcp.listServers() as Promise<McpServer[]>,
      window.api.mcp.listLinks(bookId || undefined) as Promise<McpCanonLink[]>,
      window.api.mcp.listAudit(bookId || undefined, 80) as Promise<McpAuditLog[]>
    ])
    setServers(nextServers)
    setLinks(nextLinks)
    setAudit(nextAudit)
  }, [bookId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const saveServer = async () => {
    if (!name.trim()) {
      addToast('error', '请填写 server 名称')
      return
    }
    setLoading(true)
    try {
      await window.api.mcp.saveServer({
        name: name.trim(),
        command: command.trim(),
        args: args.split(/\s+/).map((item) => item.trim()).filter(Boolean),
        status: 'disabled'
      })
      setName('')
      setCommand('')
      setArgs('')
      await refresh()
      addToast('success', 'MCP server 已保存为只读配置')
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : String(error))
    } finally {
      setLoading(false)
    }
  }

  const linkServer = async (serverId: number) => {
    if (!bookId) return
    await window.api.mcp.linkCanon(serverId, bookId, 'canon_pack')
    await refresh()
    addToast('success', '已绑定当前作品 Canon Pack')
  }

  const buildContext = async () => {
    if (!bookId) return
    setLoading(true)
    try {
      const result = await window.api.mcp.buildCanonContext(bookId) as McpContextBridgeResult
      setContextPreview(result)
      await refresh()
      addToast('success', '只读 Canon context 已生成')
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : String(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex h-[86vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-2xl">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border-primary)] bg-[var(--bg-primary)] px-5">
          <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
            <ServerCog size={18} className="text-[var(--accent-secondary)]" />
            MCP 只读桥接
          </div>
          <button type="button" onClick={closeModal} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X size={20} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[340px_1fr] overflow-hidden">
          <aside className="space-y-4 overflow-y-auto border-r border-[var(--border-primary)] bg-[var(--bg-primary)] p-3">
            <section className="space-y-2 rounded-lg border border-[var(--border-primary)] p-3">
              <div className="text-xs font-bold text-[var(--text-primary)]">Server 设置</div>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="名称" className="field w-full text-xs" />
              <input value={command} onChange={(e) => setCommand(e.target.value)} placeholder="command (不在桌面端执行)" className="field w-full font-mono text-xs" />
              <input value={args} onChange={(e) => setArgs(e.target.value)} placeholder="args" className="field w-full font-mono text-xs" />
              <button
                type="button"
                onClick={() => void saveServer()}
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded bg-[var(--accent-primary)] px-3 py-2 text-xs text-[var(--accent-contrast)] disabled:opacity-40"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                保存只读 server
              </button>
            </section>

            <section className="rounded-lg border border-[var(--border-primary)]">
              <div className="border-b border-[var(--border-primary)] px-3 py-2 text-xs font-bold text-[var(--text-primary)]">
                Servers ({servers.length})
              </div>
              <ul className="divide-y divide-[var(--border-primary)]">
                {servers.map((server) => (
                  <li key={server.id} className="flex items-center justify-between gap-2 p-3 text-xs">
                    <div className="min-w-0">
                      <div className="truncate text-[var(--text-primary)]">{server.name}</div>
                      <div className="font-mono text-[10px] text-[var(--text-muted)]">
                        {server.status} · readonly={String(server.readonly)}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button type="button" onClick={() => void linkServer(server.id)} disabled={!bookId} className="rounded p-1 text-[var(--accent-secondary)] hover:bg-[var(--accent-surface)]">
                        <Link2 size={14} />
                      </button>
                      <button type="button" onClick={async () => { await window.api.mcp.deleteServer(server.id); await refresh() }} className="rounded p-1 text-[var(--danger-primary)] hover:bg-[var(--danger-surface)]">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </aside>

          <main className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
            <section className="border-b border-[var(--border-primary)] bg-[var(--bg-primary)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-[var(--text-muted)]">
                  当前作品链接: {links.length} · 所有上下文导出强制 readonly
                </div>
                <button
                  type="button"
                  onClick={() => void buildContext()}
                  disabled={!bookId || loading}
                  className="inline-flex items-center gap-2 rounded bg-[var(--accent-primary)] px-3 py-2 text-xs text-[var(--accent-contrast)] disabled:opacity-40"
                >
                  <DatabaseZap size={13} />
                  构建 Canon Context
                </button>
              </div>
            </section>

            <section className="grid min-h-0 grid-cols-2 overflow-hidden">
              <div className="overflow-y-auto p-4">
                <h3 className="mb-2 text-sm font-bold text-[var(--text-primary)]">Context Preview</h3>
                {contextPreview ? (
                  <pre className="max-h-full overflow-auto rounded border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3 text-[11px] text-[var(--text-secondary)]">
                    {JSON.stringify(contextPreview, null, 2)}
                  </pre>
                ) : (
                  <div className="rounded border border-[var(--border-primary)] bg-[var(--bg-primary)] p-4 text-xs text-[var(--text-muted)]">
                    尚未构建 context
                  </div>
                )}
              </div>
              <div className="overflow-y-auto border-l border-[var(--border-primary)] bg-[var(--bg-primary)] p-4">
                <h3 className="mb-2 text-sm font-bold text-[var(--text-primary)]">Audit</h3>
                <ol className="space-y-2">
                  {audit.map((item) => (
                    <li key={item.id} className="rounded border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-2 text-[11px]">
                      <div className="flex justify-between gap-2">
                        <span className="font-mono text-[var(--accent-secondary)]">{item.action}</span>
                        <span className="text-[var(--text-muted)]">{item.status}</span>
                      </div>
                      <div className="mt-1 text-[var(--text-muted)]">{new Date(item.created_at).toLocaleString()}</div>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}
