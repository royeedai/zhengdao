import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Boxes,
  CalendarDays,
  Database,
  Download,
  FilePlus2,
  GitBranch,
  Layers,
  Map,
  Network,
  Play,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Swords,
  Trash2,
  Upload,
  X
} from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'
import { useBookStore } from '@/stores/book-store'
import { useChapterStore } from '@/stores/chapter-store'
import { useCharacterStore } from '@/stores/character-store'
import { usePlotStore } from '@/stores/plot-store'
import { useWikiStore } from '@/stores/wiki-store'
import { toolboxModuleLabels, type ToolboxModule } from '@/utils/toolbox/catalog'
import type { Character, ChapterMeta, Plotline, PlotNode, WikiEntry } from '@/types'

type ToolboxAssetKind =
  | 'world-article'
  | 'manuscript'
  | 'plot-board'
  | 'relationship-graph'
  | 'timeline'
  | 'interactive-map'
  | 'whiteboard'
  | 'generator-table'
  | 'rpg-campaign'
  | 'publication-page'
  | 'material-entry'
  | 'visual-asset'

type SyncStatus = 'local' | 'queued' | 'synced' | 'conflict' | 'error'
type SyncOpStatus = 'queued' | 'synced' | 'conflict' | 'error'

interface ModuleConfig {
  module: ToolboxModule
  title: string
  summary: string
  assetKind: ToolboxAssetKind
  toolSlug: string
  itemLabel: string
  placeholder: string
  icon: typeof Boxes
}

interface LocalToolboxAsset {
  id: string
  bookId: number | null
  module: ToolboxModule
  assetKind: ToolboxAssetKind
  title: string
  body: string
  items: string[]
  tags: string[]
  data: Record<string, unknown>
  links: Array<{ type: string; id: string; label: string }>
  syncStatus: SyncStatus
  contentHash: string
  createdAt: string
  updatedAt: string
}

interface LocalToolboxRun {
  id: string
  module: ToolboxModule
  toolSlug: string
  input: string
  output: Record<string, unknown>
  draftBasketRequired: true
  createdAt: string
}

interface LocalToolboxPublication {
  id: string
  slug: string
  title: string
  sourceAssetId: string
  visibility: 'private' | 'unlisted' | 'team'
  accessRules: Record<string, unknown>
  createdAt: string
}

interface LocalSyncOp {
  id: string
  op: 'upsert_asset' | 'delete_asset' | 'run_tool' | 'publish_page' | 'import_export'
  targetId: string
  status: SyncOpStatus
  note: string
  createdAt: string
}

interface LocalToolboxWorkspace {
  assets: LocalToolboxAsset[]
  runs: LocalToolboxRun[]
  publications: LocalToolboxPublication[]
  syncOps: LocalSyncOp[]
}

interface EditorState {
  id: string | null
  baseUpdatedAt: string | null
  title: string
  body: string
  items: string
  tags: string
}

interface LinkedContext {
  chapters: ChapterMeta[]
  characters: Character[]
  plotNodes: PlotNode[]
  wikiEntries: WikiEntry[]
  plotlines: Plotline[]
  wikiCategories: string[]
}

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

const moduleConfigs: ModuleConfig[] = [
  { module: 'worldbuilding', title: '世界观文章', summary: '设定文章、模板字段、自动链接和 Canon 事实。', assetKind: 'world-article', toolSlug: 'world-bible', itemLabel: '章节/字段', placeholder: '王都\n宗教\n魔法规则\n禁忌', icon: Boxes },
  { module: 'writing', title: '稿件实验室', summary: '章节片段、纠错补全、续写润色、摘要和导出。', assetKind: 'manuscript', toolSlug: 'manuscript-lab', itemLabel: '章节/场景', placeholder: '第一章雨夜追逃\n第二章交易破局', icon: FilePlus2 },
  { module: 'plotting', title: '剧情板', summary: '灵感、主题、剧情线、章节节点和 AI brainstorm。', assetKind: 'plot-board', toolSlug: 'plot-board', itemLabel: '剧情节点', placeholder: '开局钩子\n反转\n高潮\n代价', icon: GitBranch },
  { module: 'characters', title: '角色关系/家族树', summary: '角色卡、关系边、家族树、组织阵营和动态关系。', assetKind: 'relationship-graph', toolSlug: 'character-relations', itemLabel: '角色/关系', placeholder: '主角 -> 导师\n主角 -> 宿敌\n父系/母系', icon: Network },
  { module: 'timeline', title: '时间线与日历', summary: '纪元、并行时间线、自定义日历和章节事件。', assetKind: 'timeline', toolSlug: 'timeline-calendar', itemLabel: '事件', placeholder: '旧历 100 年建国\n雨季第三日刺杀', icon: CalendarDays },
  { module: 'map', title: '交互地图', summary: '地图图层、标记、地点资料链接和私密标记。', assetKind: 'interactive-map', toolSlug: 'interactive-map', itemLabel: '地点/标记', placeholder: '王都北门\n地下水道入口\n禁区图层', icon: Map },
  { module: 'whiteboard', title: '白板与图表', summary: '自由白板、结构图、思维节点和跨资料链接。', assetKind: 'whiteboard', toolSlug: 'whiteboard-charts', itemLabel: '节点', placeholder: '主题\n冲突\n伏笔\n角色弧线', icon: Layers },
  { module: 'random_tables', title: '随机表/生成器', summary: '随机表、掷骰表、命名器、桥段和素材生成器。', assetKind: 'generator-table', toolSlug: 'random-generator-studio', itemLabel: '表项', placeholder: '天气\n战利品\n路人\n金手指副作用', icon: Sparkles },
  { module: 'rpg', title: 'RPG 战役', summary: '战役、会话、玩家角色卡、状态块和 GM 私密笔记。', assetKind: 'rpg-campaign', toolSlug: 'rpg-campaign', itemLabel: '会话/状态块', placeholder: 'Session 1 入城\nNPC 状态\n遭遇表', icon: Swords },
  { module: 'publishing', title: '发布与权限', summary: '公开页、私密页、团队可见、读者视图和访问规则。', assetKind: 'publication-page', toolSlug: 'publication-access', itemLabel: '页面/规则', placeholder: '公开世界观首页\n团队可见角色表\nunlisted 时间线', icon: ShieldCheck },
  { module: 'materials', title: '原创素材库', summary: '原创/授权词库、教程、资料和用户私有库。', assetKind: 'material-entry', toolSlug: 'material-library', itemLabel: '素材', placeholder: '自建描写词\n授权参考\n私有资料', icon: Database },
  { module: 'visual', title: '视觉资产', summary: '封面、角色立绘、场景图、地图素材和提示词草案。', assetKind: 'visual-asset', toolSlug: 'visual-assets', itemLabel: '视觉条目', placeholder: '封面构图\n角色服装\n场景氛围\n地图风格', icon: Sparkles }
]

const defaultModuleConfig = moduleConfigs[0] as ModuleConfig
const emptyWorkspace: LocalToolboxWorkspace = { assets: [], runs: [], publications: [], syncOps: [] }
const secondaryButtonClass = 'flex items-center gap-2 rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--accent-border)] hover:text-[var(--text-primary)]'
const primaryButtonClass = 'flex items-center gap-2 rounded-md border border-[var(--accent-border)] bg-[var(--accent-surface)] px-3 py-2 text-xs font-semibold text-[var(--accent-secondary)] transition hover:border-[var(--accent-primary)]'
const dangerButtonClass = 'flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:border-red-400'

export default function ToolboxHubModal() {
  const closeModal = useUIStore((s) => s.closeModal)
  const books = useBookStore((s) => s.books)
  const currentBookId = useBookStore((s) => s.currentBookId)
  const volumes = useChapterStore((s) => s.volumes)
  const loadVolumes = useChapterStore((s) => s.loadVolumes)
  const characters = useCharacterStore((s) => s.characters)
  const loadCharacters = useCharacterStore((s) => s.loadCharacters)
  const plotNodes = usePlotStore((s) => s.plotNodes)
  const plotlines = usePlotStore((s) => s.plotlines)
  const loadPlotNodes = usePlotStore((s) => s.loadPlotNodes)
  const loadPlotlines = usePlotStore((s) => s.loadPlotlines)
  const wikiEntries = useWikiStore((s) => s.entries)
  const wikiCategories = useWikiStore((s) => s.categories)
  const selectedWikiCategory = useWikiStore((s) => s.selectedCategory)
  const loadWikiCategories = useWikiStore((s) => s.loadCategories)
  const loadWikiEntries = useWikiStore((s) => s.loadEntries)
  const [activeModule, setActiveModule] = useState<ToolboxModule>('worldbuilding')
  const [workspace, setWorkspace] = useState<LocalToolboxWorkspace>(emptyWorkspace)
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<EditorState>(() => createEmptyEditor(defaultModuleConfig))
  const [message, setMessage] = useState<string | null>(null)
  const [conflictAsset, setConflictAsset] = useState<LocalToolboxAsset | null>(null)

  const currentBook = books.find((book) => book.id === currentBookId)
  const activeConfig = moduleConfigs.find((config) => config.module === activeModule) ?? defaultModuleConfig
  const storageKey = `zhengdao.toolbox.v2.${currentBookId ?? 'standalone'}`

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      setWorkspace(raw ? normalizeWorkspace(JSON.parse(raw) as Partial<LocalToolboxWorkspace>) : emptyWorkspace)
    } catch {
      setWorkspace(emptyWorkspace)
    }
  }, [storageKey])

  useEffect(() => {
    setEditor((current) => ({ ...createEmptyEditor(activeConfig), id: null, baseUpdatedAt: null, tags: current.tags }))
    setConflictAsset(null)
  }, [activeConfig])

  useEffect(() => {
    if (!currentBookId) return
    void Promise.all([
      loadVolumes(currentBookId),
      loadCharacters(currentBookId),
      loadPlotNodes(currentBookId),
      loadPlotlines(currentBookId),
      loadWikiCategories(currentBookId)
    ]).catch(() => {
      setMessage('作品资料加载失败，本地工具箱仍可继续离线编辑。')
    })
  }, [currentBookId, loadCharacters, loadPlotNodes, loadPlotlines, loadVolumes, loadWikiCategories])

  useEffect(() => {
    if (!currentBookId || !selectedWikiCategory) return
    void loadWikiEntries(currentBookId, selectedWikiCategory).catch(() => undefined)
  }, [currentBookId, loadWikiEntries, selectedWikiCategory])

  const linkedContext = useMemo(
    () => ({
      chapters: volumes.flatMap((volume) => volume.chapters ?? []),
      characters,
      plotNodes,
      wikiEntries,
      plotlines,
      wikiCategories
    }),
    [characters, plotNodes, plotlines, volumes, wikiCategories, wikiEntries]
  )

  const visibleAssets = useMemo(() => {
    const text = query.trim().toLowerCase()
    return workspace.assets.filter((asset) => {
      if (asset.module !== activeModule) return false
      if (!text) return true
      return `${asset.title} ${asset.body} ${asset.tags.join(' ')} ${asset.items.join(' ')}`.toLowerCase().includes(text)
    })
  }, [activeModule, query, workspace.assets])

  const moduleCounts = useMemo(() => {
    return moduleOrder.reduce<Record<ToolboxModule, number>>((acc, module) => {
      acc[module] = workspace.assets.filter((asset) => asset.module === module).length
      return acc
    }, {} as Record<ToolboxModule, number>)
  }, [workspace.assets])

  const activeRuns = workspace.runs.filter((run) => run.module === activeModule).length
  const activePublications = workspace.publications.filter((pub) => {
    const source = workspace.assets.find((asset) => asset.id === pub.sourceAssetId)
    return source?.module === activeModule
  }).length
  const pendingOps = workspace.syncOps.filter((op) => op.status === 'queued' || op.status === 'conflict').length

  const persistWorkspace = (next: LocalToolboxWorkspace) => {
    setWorkspace(next)
    localStorage.setItem(storageKey, JSON.stringify(next))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="flex h-[88vh] w-full max-w-7xl min-w-0 flex-col overflow-hidden rounded-lg border border-[var(--border-primary)] bg-[var(--surface-elevated)] shadow-2xl">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border-primary)] px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              <Boxes size={15} />
              Creative Toolbox V2
            </div>
            <h2 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">创作工具箱工作台</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              {currentBook ? `已绑定作品《${currentBook.title}》` : '独立工具箱模式'}。所有编辑先保存在本地，AI 结果进入草稿篮，云端同步由 creative-toolbox 合同队列承接。
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

        <div className="grid min-h-0 flex-1 grid-cols-[230px_minmax(0,1fr)]">
          <aside className="min-h-0 overflow-y-auto border-r border-[var(--border-primary)] bg-[var(--surface-secondary)] p-3">
            {moduleConfigs.map((config) => {
              const Icon = config.icon
              return (
                <button
                  key={config.module}
                  type="button"
                  onClick={() => setActiveModule(config.module)}
                  className={`mb-1 flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-xs transition ${
                    activeModule === config.module
                      ? 'bg-[var(--accent-surface)] text-[var(--accent-secondary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Icon size={14} className="shrink-0" />
                    <span className="truncate font-semibold">{config.title}</span>
                  </span>
                  <span className="rounded-full bg-[var(--surface-primary)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
                    {moduleCounts[config.module] ?? 0}
                  </span>
                </button>
              )
            })}
          </aside>

          <main className="min-h-0 overflow-y-auto p-5">
            <div className="grid gap-3 lg:grid-cols-4">
              <Metric label="模块资产" value={visibleAssets.length} />
              <Metric label="草稿篮" value={activeRuns} />
              <Metric label="发布草案" value={activePublications} />
              <Metric label="待同步/冲突" value={pendingOps} />
            </div>

            <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="min-w-0 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-primary)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                      {toolboxModuleLabels[activeModule]}
                    </div>
                    <h3 className="mt-1 text-xl font-bold text-[var(--text-primary)]">{activeConfig.title}</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">{activeConfig.summary}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={importFromBook} className={secondaryButtonClass}>
                      <Upload size={14} />
                      导入作品资料
                    </button>
                    <button type="button" onClick={exportWorkspace} className={secondaryButtonClass}>
                      <Download size={14} />
                      导出 JSON
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                  <label className="relative block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="搜索标题、正文、标签、节点"
                      className="h-10 w-full rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)]"
                    />
                  </label>
                  <button type="button" onClick={() => setEditor(createEmptyEditor(activeConfig))} className={`${secondaryButtonClass} justify-center`}>
                    <FilePlus2 size={14} />
                    新建资产
                  </button>
                </div>

                {message ? <div className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{message}</div> : null}
                {conflictAsset ? (
                  <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    检测到本地冲突：{conflictAsset.title}。请确认保留当前编辑或重新选择资产。
                    <button type="button" className="ml-3 font-semibold underline" onClick={forceSaveConflict}>
                      保留当前编辑
                    </button>
                  </div>
                ) : null}

                <div className="mt-4 grid gap-3">
                  {visibleAssets.map((asset) => (
                    <button
                      type="button"
                      key={asset.id}
                      onClick={() => selectAsset(asset)}
                      className={`rounded-lg border p-4 text-left transition ${
                        editor.id === asset.id
                          ? 'border-[var(--accent-primary)] bg-[var(--accent-surface)]'
                          : 'border-[var(--border-primary)] bg-[var(--bg-primary)] hover:border-[var(--accent-border)]'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">{asset.assetKind}</div>
                          <h4 className="mt-1 truncate text-base font-semibold text-[var(--text-primary)]">{asset.title}</h4>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${asset.syncStatus === 'conflict' ? 'bg-amber-100 text-amber-700' : 'bg-[var(--accent-surface)] text-[var(--accent-secondary)]'}`}>
                          {asset.syncStatus}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">
                        {asset.body || asset.items.slice(0, 4).join(' / ') || '已保存 typed payload'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {asset.tags.slice(0, 4).map((tag) => (
                          <span key={tag} className="rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                  {visibleAssets.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[var(--border-primary)] bg-[var(--bg-primary)] p-8 text-sm text-[var(--text-muted)]">
                      当前模块还没有资产。可以从作品资料导入，也可以用右侧编辑器创建。
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid content-start gap-3">
                <ActionPanel icon={<Save size={14} />} title={editor.id ? '编辑资产' : '创建资产'}>
                  <Input label="标题" value={editor.title} onChange={(title) => setEditor({ ...editor, title })} />
                  <Textarea label="正文/说明" rows={5} value={editor.body} onChange={(body) => setEditor({ ...editor, body })} />
                  <Textarea label={activeConfig.itemLabel} rows={5} value={editor.items} onChange={(items) => setEditor({ ...editor, items })} />
                  <Input label="标签" value={editor.tags} onChange={(tags) => setEditor({ ...editor, tags })} />
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={saveAsset} className={`${primaryButtonClass} justify-center`}>
                      <Save size={14} />
                      保存
                    </button>
                    <button type="button" onClick={queueDraft} className={`${secondaryButtonClass} justify-center`}>
                      <Play size={14} />
                      草稿篮
                    </button>
                    <button type="button" onClick={createPublication} className={`${secondaryButtonClass} justify-center`}>
                      <ShieldCheck size={14} />
                      发布草案
                    </button>
                    <button type="button" disabled={!editor.id} onClick={deleteAsset} className={`${dangerButtonClass} justify-center disabled:opacity-40`}>
                      <Trash2 size={14} />
                      删除
                    </button>
                  </div>
                </ActionPanel>

                <ActionPanel icon={<RefreshCw size={14} />} title="离线同步队列">
                  <div className="max-h-44 overflow-y-auto rounded-md border border-[var(--border-primary)]">
                    {workspace.syncOps.slice(0, 8).map((op) => (
                      <div key={op.id} className="border-b border-[var(--border-primary)] px-3 py-2 last:border-b-0">
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="font-semibold text-[var(--text-primary)]">{op.op}</span>
                          <span className={op.status === 'conflict' ? 'text-amber-600' : 'text-[var(--text-muted)]'}>{op.status}</span>
                        </div>
                        <div className="mt-1 text-[10px] text-[var(--text-secondary)]">{op.note}</div>
                      </div>
                    ))}
                    {workspace.syncOps.length === 0 ? (
                      <div className="px-3 py-5 text-xs text-[var(--text-muted)]">暂无待处理操作。</div>
                    ) : null}
                  </div>
                  <button type="button" onClick={markQueuedSynced} className={`${secondaryButtonClass} justify-center`}>
                    <RefreshCw size={14} />
                    标记已同步
                  </button>
                </ActionPanel>

                <ActionPanel icon={<Database size={14} />} title="作品上下文">
                  <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-secondary)]">
                    <MiniStat label="章节" value={linkedContext.chapters.length} />
                    <MiniStat label="人物" value={linkedContext.characters.length} />
                    <MiniStat label="剧情节点" value={linkedContext.plotNodes.length} />
                    <MiniStat label="维基" value={linkedContext.wikiEntries.length} />
                  </div>
                  <p className="text-[11px] leading-5 text-[var(--text-muted)]">
                    导入时会写入跨资产链接，不会覆盖原章节、人物或设定。
                  </p>
                </ActionPanel>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  )

  function selectAsset(asset: LocalToolboxAsset) {
    setEditor({
      id: asset.id,
      baseUpdatedAt: asset.updatedAt,
      title: asset.title,
      body: asset.body,
      items: asset.items.join('\n'),
      tags: asset.tags.join(', ')
    })
    setConflictAsset(null)
  }

  function saveAsset() {
    upsertFromEditor(false)
  }

  function forceSaveConflict() {
    upsertFromEditor(true)
  }

  function upsertFromEditor(force: boolean) {
    const now = new Date().toISOString()
    const items = splitLines(editor.items)
    const tags = splitTags(editor.tags)
    const existing = editor.id ? workspace.assets.find((asset) => asset.id === editor.id) : null
    if (existing && !force && editor.baseUpdatedAt && existing.updatedAt !== editor.baseUpdatedAt) {
      const conflicted = { ...existing, syncStatus: 'conflict' as SyncStatus }
      setConflictAsset(conflicted)
      persistWorkspace({
        ...workspace,
        assets: workspace.assets.map((asset) => (asset.id === existing.id ? conflicted : asset)),
        syncOps: [createSyncOp('upsert_asset', existing.id, 'conflict', '本地资产在编辑期间发生变更'), ...workspace.syncOps]
      })
      return
    }
    const id = existing?.id ?? `asset-${Date.now()}`
    const data = createPayload(activeConfig, editor, linkedContext)
    const nextAsset: LocalToolboxAsset = {
      id,
      bookId: currentBookId,
      module: activeConfig.module,
      assetKind: activeConfig.assetKind,
      title: editor.title.trim() || activeConfig.title,
      body: editor.body,
      items,
      tags,
      data,
      links: createLinks(activeConfig.module, linkedContext),
      syncStatus: 'queued',
      contentHash: hashText(JSON.stringify(data) + editor.title + editor.body),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    }
    const nextAssets = existing
      ? workspace.assets.map((asset) => (asset.id === existing.id ? nextAsset : asset))
      : [nextAsset, ...workspace.assets]
    persistWorkspace({
      ...workspace,
      assets: nextAssets,
      syncOps: [createSyncOp('upsert_asset', id, 'queued', `${activeConfig.title} 已进入云同步队列`), ...workspace.syncOps]
    })
    setEditor({ ...editor, id, baseUpdatedAt: now })
    setConflictAsset(null)
    setMessage('资产已保存，待联网后按 creative-toolbox 合同同步。')
  }

  function deleteAsset() {
    if (!editor.id) return
    persistWorkspace({
      ...workspace,
      assets: workspace.assets.filter((asset) => asset.id !== editor.id),
      syncOps: [createSyncOp('delete_asset', editor.id, 'queued', '删除操作已排入同步队列'), ...workspace.syncOps]
    })
    setEditor(createEmptyEditor(activeConfig))
    setMessage('资产已删除，本地删除操作已排队同步。')
  }

  function queueDraft() {
    const now = new Date().toISOString()
    const run: LocalToolboxRun = {
      id: `run-${Date.now()}`,
      module: activeConfig.module,
      toolSlug: activeConfig.toolSlug,
      input: `${editor.title}\n${editor.body}\n${editor.items}`,
      output: { draftBasketRequired: true, payload: createPayload(activeConfig, editor, linkedContext) },
      draftBasketRequired: true,
      createdAt: now
    }
    persistWorkspace({
      ...workspace,
      runs: [run, ...workspace.runs],
      syncOps: [createSyncOp('run_tool', run.id, 'queued', 'AI 输出已进入草稿篮记录，未写入正文'), ...workspace.syncOps]
    })
    setMessage('已进入草稿篮记录，确认前不会改正文或作品资产。')
  }

  function createPublication() {
    const sourceAssetId = editor.id ?? visibleAssets[0]?.id ?? ''
    const title = editor.title.trim() || activeConfig.title
    const pub: LocalToolboxPublication = {
      id: `pub-${Date.now()}`,
      slug: slugify(`${activeConfig.module}-${title}`),
      title,
      sourceAssetId,
      visibility: 'unlisted',
      accessRules: { readerView: true, collaboratorRoles: ['owner', 'editor', 'viewer'], externalCheckout: false },
      createdAt: new Date().toISOString()
    }
    persistWorkspace({
      ...workspace,
      publications: [pub, ...workspace.publications],
      syncOps: [createSyncOp('publish_page', pub.id, 'queued', '发布草案已创建，默认 unlisted'), ...workspace.syncOps]
    })
    setMessage('发布草案已创建，权限规则已显式记录。')
  }

  function importFromBook() {
    const imported = importAssetsForModule(activeConfig, linkedContext, currentBookId)
    if (imported.length === 0) {
      setMessage('当前作品没有可导入的资料，已保留手动编辑入口。')
      return
    }
    persistWorkspace({
      ...workspace,
      assets: [...imported, ...workspace.assets],
      syncOps: [
        createSyncOp('import_export', `import-${Date.now()}`, 'queued', `从作品导入 ${imported.length} 条 ${activeConfig.title}`),
        ...workspace.syncOps
      ]
    })
    setMessage(`已从作品导入 ${imported.length} 条资料。`)
  }

  function exportWorkspace() {
    const payload = JSON.stringify({ version: 2, bookId: currentBookId, module: activeModule, workspace }, null, 2)
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `creative-toolbox-${currentBookId ?? 'standalone'}-${activeModule}.json`
    link.click()
    URL.revokeObjectURL(url)
    persistWorkspace({
      ...workspace,
      syncOps: [createSyncOp('import_export', `export-${Date.now()}`, 'synced', '本地 JSON 导出完成'), ...workspace.syncOps]
    })
  }

  function markQueuedSynced() {
    persistWorkspace({
      ...workspace,
      assets: workspace.assets.map((asset) => asset.syncStatus === 'queued' ? { ...asset, syncStatus: 'synced' } : asset),
      syncOps: workspace.syncOps.map((op) => op.status === 'queued' ? { ...op, status: 'synced' } : op)
    })
    setMessage('已将队列标记为本地同步完成。真实云同步由后端会话接管。')
  }
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-primary)] px-4 py-3">
      <div className="text-xl font-bold text-[var(--text-primary)]">{value}</div>
      <div className="mt-1 text-[11px] text-[var(--text-muted)]">{label}</div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2">
      <div className="font-semibold text-[var(--text-primary)]">{value}</div>
      <div className="mt-1 text-[10px] text-[var(--text-muted)]">{label}</div>
    </div>
  )
}

function ActionPanel({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-primary)] p-3">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
        <span className="text-[var(--accent-secondary)]">{icon}</span>
        {title}
      </div>
      <div className="grid gap-2">{children}</div>
    </div>
  )
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-xs text-[var(--text-muted)]">
      <span className="mb-1 block">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-9 w-full rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 text-xs text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)]"
      />
    </label>
  )
}

function Textarea({
  label,
  rows,
  value,
  onChange
}: {
  label: string
  rows: number
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block text-xs text-[var(--text-muted)]">
      <span className="mb-1 block">{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-y rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-xs leading-5 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)]"
      />
    </label>
  )
}

function createEmptyEditor(config: ModuleConfig): EditorState {
  return { id: null, baseUpdatedAt: null, title: config.title, body: '', items: config.placeholder, tags: '' }
}

function normalizeWorkspace(workspace: Partial<LocalToolboxWorkspace>): LocalToolboxWorkspace {
  return {
    assets: Array.isArray(workspace.assets) ? workspace.assets : [],
    runs: Array.isArray(workspace.runs) ? workspace.runs : [],
    publications: Array.isArray(workspace.publications) ? workspace.publications : [],
    syncOps: Array.isArray(workspace.syncOps) ? workspace.syncOps : []
  }
}

function splitLines(value: string): string[] {
  return value.split(/\n|、|,/).map((item) => item.trim()).filter(Boolean)
}

function splitTags(value: string): string[] {
  return value.split(/,|，/).map((item) => item.trim()).filter(Boolean)
}

function createPayload(config: ModuleConfig, editor: EditorState, context: LinkedContext) {
  const items = splitLines(editor.items)
  if (config.assetKind === 'interactive-map') {
    return {
      payloadVersion: 2,
      imageUrl: null,
      layers: [{ id: 'default', title: '默认图层', visible: true, secret: false }],
      markers: items.map((label, index) => ({ id: `marker-${index + 1}`, label, x: 14 + index * 8, y: 18 + index * 6, layerId: 'default', linkedAssetId: null }))
    }
  }
  if (config.assetKind === 'relationship-graph') {
    const nodes = items.length ? items : context.characters.map((character) => character.name)
    return {
      payloadVersion: 2,
      nodes: nodes.map((label, index) => ({ id: `node-${index + 1}`, label, kind: 'character', x: 80 + index * 34, y: 90 + index * 22 })),
      edges: nodes.slice(1).map((label, index) => ({ id: `edge-${index + 1}`, sourceId: `node-${index + 1}`, targetId: `node-${index + 2}`, label: label.includes('->') ? label.split('->')[1]?.trim() ?? '关联' : '关联' }))
    }
  }
  if (config.assetKind === 'timeline') {
    return {
      payloadVersion: 2,
      calendarId: null,
      eras: [],
      events: items.map((title, index) => ({ id: `event-${index + 1}`, title, date: `T+${index + 1}`, track: '主线', body: editor.body, linkedAssetIds: [] }))
    }
  }
  if (config.assetKind === 'whiteboard') {
    return {
      payloadVersion: 2,
      nodes: items.map((text, index) => ({ id: `note-${index + 1}`, text, x: 80 + index * 30, y: 90 + index * 18, color: '#7da0c4', linkedAssetId: null })),
      connectors: []
    }
  }
  if (config.assetKind === 'generator-table') {
    return {
      payloadVersion: 2,
      dice: `1d${Math.max(items.length, 1)}`,
      columns: ['结果'],
      rows: items.map((value, index) => ({ id: `row-${index + 1}`, weight: 1, values: [value] }))
    }
  }
  if (config.assetKind === 'rpg-campaign') {
    return {
      payloadVersion: 2,
      system: 'custom',
      sessions: items.map((title, index) => ({ id: `session-${index + 1}`, title, status: 'planned', notes: editor.body })),
      statblocks: []
    }
  }
  if (config.assetKind === 'visual-asset') {
    return {
      payloadVersion: 2,
      prompt: editor.body || items.join(', '),
      usage: 'reference',
      assetUrl: null,
      sourcePolicy: 'original_or_licensed_only'
    }
  }
  return {
    payloadVersion: 2,
    summary: editor.body,
    fields: { tags: splitTags(editor.tags) },
    sections: items.map((title, index) => ({ id: `section-${index + 1}`, title, body: '', tags: splitTags(editor.tags) })),
    links: []
  }
}

function createLinks(module: ToolboxModule, context: LinkedContext) {
  if (module === 'writing') {
    return context.chapters.slice(0, 20).map((chapter) => ({ type: 'chapter', id: String(chapter.id), label: chapter.title }))
  }
  if (module === 'characters') {
    return context.characters.slice(0, 30).map((character) => ({ type: 'character', id: String(character.id), label: character.name }))
  }
  if (module === 'plotting' || module === 'timeline') {
    return context.plotNodes.slice(0, 30).map((node) => ({ type: 'plot_node', id: String(node.id), label: node.title }))
  }
  return context.wikiEntries.slice(0, 30).map((entry) => ({ type: 'wiki_entry', id: String(entry.id), label: entry.title }))
}

function importAssetsForModule(config: ModuleConfig, context: LinkedContext, bookId: number | null): LocalToolboxAsset[] {
  const now = new Date().toISOString()
  const rows = deriveImportRows(config.module, context)
  return rows.map((row, index) => {
    const editor: EditorState = {
      id: null,
      baseUpdatedAt: null,
      title: row.title,
      body: row.body,
      items: row.items.join('\n'),
      tags: row.tags.join(', ')
    }
    const data = createPayload(config, editor, context)
    return {
      id: `asset-${Date.now()}-${index}`,
      bookId,
      module: config.module,
      assetKind: config.assetKind,
      title: row.title,
      body: row.body,
      items: row.items,
      tags: row.tags,
      data,
      links: row.links,
      syncStatus: 'queued',
      contentHash: hashText(JSON.stringify(data) + row.title + row.body),
      createdAt: now,
      updatedAt: now
    }
  })
}

function deriveImportRows(module: ToolboxModule, context: LinkedContext) {
  if (module === 'worldbuilding') {
    return context.wikiEntries.map((entry) => ({ title: entry.title, body: entry.content, items: [entry.category], tags: ['wiki', entry.category], links: [{ type: 'wiki_entry', id: String(entry.id), label: entry.title }] }))
  }
  if (module === 'writing') {
    return context.chapters.slice(0, 20).map((chapter) => ({ title: chapter.title, body: chapter.summary ?? '', items: [chapter.title], tags: ['chapter'], links: [{ type: 'chapter', id: String(chapter.id), label: chapter.title }] }))
  }
  if (module === 'characters') {
    return context.characters.map((character) => ({ title: character.name, body: character.description, items: [character.faction, character.status].filter(Boolean), tags: ['character', character.faction].filter(Boolean), links: [{ type: 'character', id: String(character.id), label: character.name }] }))
  }
  if (module === 'plotting' || module === 'timeline') {
    return context.plotNodes.map((node) => ({ title: node.title, body: node.description, items: [`第 ${node.chapter_number} 章`, `score ${node.score}`], tags: ['plot'], links: [{ type: 'plot_node', id: String(node.id), label: node.title }] }))
  }
  if (module === 'map' || module === 'materials') {
    return context.wikiEntries.map((entry) => ({ title: entry.title, body: entry.content, items: [entry.category], tags: ['source', entry.category], links: [{ type: 'wiki_entry', id: String(entry.id), label: entry.title }] }))
  }
  return []
}

function createSyncOp(op: LocalSyncOp['op'], targetId: string, status: SyncOpStatus, note: string): LocalSyncOp {
  return { id: `op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, op, targetId, status, note, createdAt: new Date().toISOString() }
}

function hashText(value: string): string {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (Math.imul(31, hash) + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash).toString(16).padStart(32, '0')
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'toolbox-page'
}
