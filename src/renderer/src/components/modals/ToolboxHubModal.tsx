import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Boxes, CheckCircle2, FilePlus2, Play, Save, ShieldCheck, Sparkles, X } from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'
import { useBookStore } from '@/stores/book-store'
import { toolboxModuleLabels, toolboxTools, type ToolboxModule } from '@/utils/toolbox/catalog'

const moduleOrder: ToolboxModule[] = [
  'worldbuilding',
  'writing',
  'plotting',
  'characters',
  'timeline',
  'map',
  'whiteboard',
  'random_tables',
  'rpg',
  'publishing',
  'materials',
  'visual'
]

interface LocalToolboxAsset {
  id: string
  kind: string
  title: string
  body: string
  status: 'local' | 'draft' | 'published'
  createdAt: string
}

interface LocalToolboxRun {
  id: string
  toolSlug: string
  input: string
  draftBasketRequired: true
  createdAt: string
}

interface LocalToolboxPublication {
  id: string
  slug: string
  title: string
  sourceAssetId: string
  visibility: 'private' | 'unlisted'
  createdAt: string
}

interface LocalToolboxWorkspace {
  assets: LocalToolboxAsset[]
  runs: LocalToolboxRun[]
  publications: LocalToolboxPublication[]
}

const emptyWorkspace: LocalToolboxWorkspace = { assets: [], runs: [], publications: [] }

export default function ToolboxHubModal() {
  const closeModal = useUIStore((s) => s.closeModal)
  const currentBookId = useBookStore((s) => s.currentBookId)
  const [activeModule, setActiveModule] = useState<ToolboxModule | 'all'>('all')
  const [workspace, setWorkspace] = useState<LocalToolboxWorkspace>(emptyWorkspace)
  const [assetTitle, setAssetTitle] = useState('新设定条目')
  const [assetBody, setAssetBody] = useState('')
  const [runPrompt, setRunPrompt] = useState('整理当前章节的剧情风险')
  const [publicationTitle, setPublicationTitle] = useState('作品展示页')

  const tools = useMemo(
    () => (activeModule === 'all' ? toolboxTools : toolboxTools.filter((tool) => tool.module === activeModule)),
    [activeModule]
  )
  const selectedTool = tools[0] ?? toolboxTools[0]
  const storageKey = `zhengdao.toolbox.workspace.${currentBookId ?? 'standalone'}`

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      setWorkspace(raw ? (JSON.parse(raw) as LocalToolboxWorkspace) : emptyWorkspace)
    } catch {
      setWorkspace(emptyWorkspace)
    }
  }, [storageKey])

  const persistWorkspace = (next: LocalToolboxWorkspace) => {
    setWorkspace(next)
    localStorage.setItem(storageKey, JSON.stringify(next))
  }

  const createAsset = () => {
    const now = new Date().toISOString()
    persistWorkspace({
      ...workspace,
      assets: [
        {
          id: `asset-${Date.now()}`,
          kind: selectedTool.slug,
          title: assetTitle || selectedTool.title,
          body: assetBody,
          status: 'local',
          createdAt: now
        },
        ...workspace.assets
      ]
    })
    setAssetBody('')
  }

  const createRun = () => {
    const now = new Date().toISOString()
    persistWorkspace({
      ...workspace,
      runs: [
        {
          id: `run-${Date.now()}`,
          toolSlug: selectedTool.slug,
          input: runPrompt,
          draftBasketRequired: true,
          createdAt: now
        },
        ...workspace.runs
      ]
    })
  }

  const createPublication = () => {
    const now = new Date().toISOString()
    const sourceAsset = workspace.assets[0]
    persistWorkspace({
      ...workspace,
      publications: [
        {
          id: `pub-${Date.now()}`,
          slug: (publicationTitle || 'workspace').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
          title: publicationTitle,
          sourceAssetId: sourceAsset?.id ?? '',
          visibility: 'unlisted',
          createdAt: now
        },
        ...workspace.publications
      ]
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="flex h-[86vh] w-full max-w-6xl min-w-0 flex-col overflow-hidden rounded-lg border border-[var(--border-primary)] bg-[var(--surface-elevated)] shadow-2xl">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border-primary)] px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              <Boxes size={15} />
              Creative Toolbox
            </div>
            <h2 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">创作工具箱 Hub</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              这里先接入后端合同目录。工具可独立使用，也能进入当前作品；任何会改变正文或资产的 AI 输出仍必须进入草稿篮或显式确认。
            </p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            aria-label="关闭创作工具箱"
            className="rounded-md p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          >
            <X size={18} />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[220px_minmax(0,1fr)]">
          <aside className="min-h-0 overflow-y-auto border-r border-[var(--border-primary)] bg-[var(--surface-secondary)] p-3">
            <ModuleButton
              label="全部工具"
              count={toolboxTools.length}
              active={activeModule === 'all'}
              onClick={() => setActiveModule('all')}
            />
            <div className="my-3 border-t border-[var(--border-primary)]" />
            {moduleOrder.map((module) => (
              <ModuleButton
                key={module}
                label={toolboxModuleLabels[module]}
                count={toolboxTools.filter((tool) => tool.module === module).length}
                active={activeModule === module}
                onClick={() => setActiveModule(module)}
              />
            ))}
          </aside>

          <main className="min-h-0 overflow-y-auto p-5">
            <section className="grid gap-3 md:grid-cols-3">
              <PolicyCard
                icon={<ShieldCheck size={16} />}
                title="素材来源"
                body="只允许原创、授权、后台导入或用户私有内容。"
              />
              <PolicyCard
                icon={<Sparkles size={16} />}
                title="AI 写入"
                body="生成正文或作品资产时，必须先进入草稿篮。"
              />
              <PolicyCard
                icon={<CheckCircle2 size={16} />}
                title="对标口径"
                body="合同覆盖不等于功能完成；发布前以 parity matrix 全绿为准。"
              />
            </section>

            <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-primary)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">本地工具箱工作区</h3>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      当前作品：{currentBookId ?? '独立工具箱'}；本地资产可离线保存，云同步时按 backend creative-toolbox 合同上传。
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs text-[var(--text-secondary)]">
                    <Counter label="资产" value={workspace.assets.length} />
                    <Counter label="运行" value={workspace.runs.length} />
                    <Counter label="发布" value={workspace.publications.length} />
                  </div>
                </div>
                <div className="mt-4 grid gap-3">
                  {workspace.assets.slice(0, 4).map((asset) => (
                    <div key={asset.id} className="rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{asset.title}</div>
                          <div className="mt-1 text-[11px] text-[var(--text-muted)]">{asset.kind}</div>
                        </div>
                        <span className="rounded-full bg-[var(--accent-surface)] px-2 py-0.5 text-[10px] text-[var(--accent-secondary)]">
                          {asset.status}
                        </span>
                      </div>
                      {asset.body ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">{asset.body}</p> : null}
                    </div>
                  ))}
                  {workspace.assets.length === 0 ? (
                    <div className="rounded-md border border-dashed border-[var(--border-primary)] p-4 text-xs text-[var(--text-muted)]">
                      还没有本地工具资产。
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3">
                <ActionPanel icon={<Save size={14} />} title="保存资产">
                  <Input value={assetTitle} onChange={setAssetTitle} />
                  <Textarea value={assetBody} onChange={setAssetBody} />
                  <button type="button" onClick={createAsset} className="flex items-center justify-center gap-2 rounded-md border border-[var(--accent-border)] bg-[var(--accent-surface)] px-3 py-2 text-xs font-semibold text-[var(--accent-secondary)] transition hover:border-[var(--accent-primary)]">
                    <Save size={14} />
                    保存为 {selectedTool.title}
                  </button>
                </ActionPanel>
                <ActionPanel icon={<Play size={14} />} title="工具运行">
                  <Textarea value={runPrompt} onChange={setRunPrompt} />
                  <button type="button" onClick={createRun} className="flex items-center justify-center gap-2 rounded-md border border-[var(--accent-border)] bg-[var(--accent-surface)] px-3 py-2 text-xs font-semibold text-[var(--accent-secondary)] transition hover:border-[var(--accent-primary)]">
                    <Play size={14} />
                    进入草稿篮记录
                  </button>
                </ActionPanel>
                <ActionPanel icon={<FilePlus2 size={14} />} title="发布草案">
                  <Input value={publicationTitle} onChange={setPublicationTitle} />
                  <button type="button" onClick={createPublication} className="flex items-center justify-center gap-2 rounded-md border border-[var(--accent-border)] bg-[var(--accent-surface)] px-3 py-2 text-xs font-semibold text-[var(--accent-secondary)] transition hover:border-[var(--accent-primary)]">
                    <FilePlus2 size={14} />
                    生成发布草案
                  </button>
                </ActionPanel>
              </div>
            </section>

            <section className="mt-5 grid gap-4 lg:grid-cols-2">
              {tools.map((tool) => (
                <article
                  key={tool.slug}
                  className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-primary)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                        {toolboxModuleLabels[tool.module]}
                      </div>
                      <h3 className="mt-1 text-lg font-bold text-[var(--text-primary)]">{tool.title}</h3>
                    </div>
                    <span className="rounded-full border border-[var(--accent-border)] bg-[var(--accent-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent-secondary)]">
                      合同已锁定
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{tool.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {tool.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[var(--bg-tertiary)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3">
                    <div className="text-[11px] font-semibold text-[var(--text-muted)]">对标覆盖</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {tool.parity.map((item) => (
                        <span key={item} className="rounded border border-[var(--border-primary)] px-2 py-1 text-[11px] text-[var(--text-secondary)]">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}

function ModuleButton({
  label,
  count,
  active,
  onClick
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-1 flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-xs transition ${
        active
          ? 'bg-[var(--accent-surface)] text-[var(--accent-secondary)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
      }`}
    >
      <span className="font-semibold">{label}</span>
      <span className="rounded-full bg-[var(--surface-primary)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
        {count}
      </span>
    </button>
  )
}

function PolicyCard({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-primary)] p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
        <span className="text-[var(--accent-secondary)]">{icon}</span>
        {title}
      </div>
      <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{body}</p>
    </div>
  )
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-12 rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] px-2 py-1">
      <div className="font-semibold text-[var(--text-primary)]">{value}</div>
      <div className="mt-0.5 text-[10px] text-[var(--text-muted)]">{label}</div>
    </div>
  )
}

function ActionPanel({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-primary)] p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
        <span className="text-[var(--accent-secondary)]">{icon}</span>
        {title}
      </div>
      <div className="grid gap-2">{children}</div>
    </div>
  )
}

function Input({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-9 rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 text-xs text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)]"
    />
  )
}

function Textarea({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <textarea
      rows={3}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="resize-none rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-xs leading-5 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)]"
    />
  )
}
