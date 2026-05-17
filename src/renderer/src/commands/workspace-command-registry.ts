import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Bot,
  Boxes,
  Coffee,
  Command,
  Download,
  FilePlus,
  FileSearch,
  FileUp,
  Layers,
  Leaf,
  Lightbulb,
  Maximize2,
  Moon,
  Monitor,
  PanelBottom,
  PanelLeft,
  PanelRight,
  Search,
  Settings,
  Smartphone,
  Sun,
  Users,
  UserPlus,
  WandSparkles,
  Waves
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ModalType } from '@/types'
import type { ThemeId } from '@/utils/themes'

export type CommandCategory = '导航' | '编辑' | 'AI' | '视图' | '主题' | '应用'
export type CommandSurface = 'commandPalette' | 'topbarTools' | 'bookActionPanel' | 'editorContext'
export type WorkspaceToolGroupId = 'current-work' | 'writing-aids' | 'toolbox'

export type WorkspaceCommandId =
  | 'nav.bookshelf'
  | 'nav.commandPalette'
  | 'nav.globalSearch'
  | 'nav.bookOverview'
  | 'nav.fullCharacters'
  | 'nav.wiki'
  | 'nav.stats'
  | 'nav.foreshadowBoard'
  | 'nav.quickNotes'
  | 'nav.projectSettings'
  | 'nav.toolboxHub'
  | 'nav.writingIntel'
  | 'nav.marketScan'
  | 'nav.director'
  | 'nav.visualStudio'
  | 'nav.mcp'
  | 'nav.export'
  | 'nav.import'
  | 'edit.newVolume'
  | 'edit.newChapter'
  | 'edit.newCharacter'
  | 'ai.assistant'
  | 'ai.settings'
  | 'view.left'
  | 'view.right'
  | 'view.bottom'
  | 'view.blackroom'
  | 'theme.system'
  | 'theme.light'
  | 'theme.dark'
  | 'theme.green'
  | 'theme.blue'
  | 'theme.warm'
  | 'theme.oled'
  | 'app.settings'

export interface WorkspaceCommandDef {
  id: WorkspaceCommandId
  label: string
  menuLabel?: string
  category: CommandCategory
  icon: LucideIcon
  shortcut?: string
  requiresBook?: boolean
  aliases?: string[]
  surfaces: CommandSurface[]
  modal?: Exclude<ModalType, null>
  theme?: ThemeId
  workspaceTool?: {
    group: WorkspaceToolGroupId
    showInPrimaryBar: boolean
    primaryTone: 'accent' | 'neutral'
  }
}

export interface WorkspaceCommand extends WorkspaceCommandDef {
  action: () => void
}

export interface WorkspaceCommandContext {
  openModal: (type: ModalType, data?: Record<string, unknown> | null) => void
  openAiAssistant: () => void
  closeBook: () => void
  toggleLeftPanel: () => void
  toggleRightPanel: () => void
  toggleBottomPanel: () => void
  setBlackRoomMode: (flag: boolean) => void
  setTheme: (theme: string) => void
}

function formatModShortcut(letter: string) {
  if (typeof navigator === 'undefined') return `Ctrl+${letter}`
  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)
  return isMac ? `⌘${letter}` : `Ctrl+${letter}`
}

function formatBottomPanelShortcut() {
  if (typeof navigator === 'undefined') return 'Ctrl+`'
  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)
  return isMac ? '⌃`' : 'Ctrl+`'
}

export const WORKSPACE_COMMAND_REGISTRY: WorkspaceCommandDef[] = [
  {
    id: 'nav.bookshelf',
    label: '返回书架',
    category: '导航',
    icon: BookOpen,
    requiresBook: true,
    aliases: ['关闭作品', '作品库'],
    surfaces: ['commandPalette']
  },
  {
    id: 'nav.commandPalette',
    label: '找动作',
    category: '导航',
    shortcut: formatModShortcut('K'),
    icon: Command,
    aliases: ['命令面板', 'command'],
    surfaces: ['commandPalette', 'topbarTools']
  },
  {
    id: 'nav.globalSearch',
    label: '搜内容',
    category: '导航',
    shortcut: formatModShortcut('P'),
    icon: FileSearch,
    aliases: ['全局搜索', '搜索章节', '搜索作品'],
    surfaces: ['commandPalette', 'topbarTools']
  },
  {
    id: 'nav.bookOverview',
    label: '总览',
    menuLabel: '总览',
    category: '导航',
    icon: BarChart3,
    requiresBook: true,
    modal: 'bookOverview',
    aliases: ['作品首页', '数据总览'],
    surfaces: ['commandPalette', 'topbarTools'],
    workspaceTool: { group: 'current-work', showInPrimaryBar: false, primaryTone: 'neutral' }
  },
  {
    id: 'nav.fullCharacters',
    label: '角色总库',
    category: '导航',
    icon: Users,
    requiresBook: true,
    modal: 'fullCharacters',
    aliases: ['人物', '角色'],
    surfaces: ['commandPalette', 'topbarTools'],
    workspaceTool: { group: 'current-work', showInPrimaryBar: true, primaryTone: 'neutral' }
  },
  {
    id: 'nav.wiki',
    label: '设定维基',
    category: '导航',
    icon: BookOpen,
    requiresBook: true,
    modal: 'settings',
    aliases: ['世界观', '资料'],
    surfaces: ['commandPalette', 'topbarTools'],
    workspaceTool: { group: 'current-work', showInPrimaryBar: true, primaryTone: 'neutral' }
  },
  {
    id: 'nav.stats',
    label: '数据',
    menuLabel: '数据中心',
    category: '导航',
    icon: BarChart3,
    requiresBook: true,
    modal: 'stats',
    aliases: ['统计', '写作数据'],
    surfaces: ['commandPalette', 'topbarTools'],
    workspaceTool: { group: 'current-work', showInPrimaryBar: true, primaryTone: 'neutral' }
  },
  {
    id: 'nav.foreshadowBoard',
    label: '伏笔看板',
    category: '导航',
    icon: AlertCircle,
    requiresBook: true,
    modal: 'foreshadowBoard',
    aliases: ['伏笔'],
    surfaces: ['commandPalette', 'topbarTools'],
    workspaceTool: { group: 'writing-aids', showInPrimaryBar: false, primaryTone: 'neutral' }
  },
  {
    id: 'nav.quickNotes',
    label: '灵感速记',
    category: '导航',
    icon: Lightbulb,
    requiresBook: true,
    modal: 'quickNotes',
    aliases: ['速记', '笔记'],
    surfaces: ['commandPalette', 'topbarTools'],
    workspaceTool: { group: 'writing-aids', showInPrimaryBar: false, primaryTone: 'neutral' }
  },
  {
    id: 'nav.projectSettings',
    label: '作品设置',
    category: '导航',
    icon: Settings,
    requiresBook: true,
    modal: 'projectSettings',
    aliases: ['项目设置'],
    surfaces: ['commandPalette', 'topbarTools'],
    workspaceTool: { group: 'writing-aids', showInPrimaryBar: true, primaryTone: 'accent' }
  },
  {
    id: 'nav.toolboxHub',
    label: '工具箱',
    menuLabel: '创作工具箱',
    category: '导航',
    icon: Boxes,
    requiresBook: true,
    modal: 'toolboxHub',
    aliases: ['工具箱', '工具'],
    surfaces: ['commandPalette', 'topbarTools'],
    workspaceTool: { group: 'toolbox', showInPrimaryBar: true, primaryTone: 'accent' }
  },
  {
    id: 'nav.writingIntel',
    label: '写作情报中心',
    category: '导航',
    icon: Search,
    requiresBook: true,
    modal: 'writingIntel',
    aliases: ['情报', '榜单'],
    surfaces: ['commandPalette']
  },
  {
    id: 'nav.marketScan',
    label: '扫榜拆文',
    category: '导航',
    icon: WandSparkles,
    requiresBook: true,
    modal: 'marketScanDeconstruct',
    aliases: ['市场扫描', '拆文'],
    surfaces: ['commandPalette']
  },
  {
    id: 'nav.director',
    label: '自动导演主链',
    category: '导航',
    icon: WandSparkles,
    requiresBook: true,
    modal: 'directorPanel',
    aliases: ['导演', '自动导演'],
    surfaces: ['commandPalette']
  },
  {
    id: 'nav.visualStudio',
    label: '视觉资产工作室',
    category: '导航',
    icon: Boxes,
    requiresBook: true,
    modal: 'visualStudio',
    aliases: ['视觉资产', '封面'],
    surfaces: ['commandPalette']
  },
  {
    id: 'nav.mcp',
    label: 'MCP 设置',
    category: '导航',
    icon: Settings,
    modal: 'mcpSettings',
    aliases: ['外部工具'],
    surfaces: ['commandPalette']
  },
  {
    id: 'nav.export',
    label: '打开导出面板',
    category: '导航',
    shortcut: formatModShortcut('E'),
    icon: Download,
    requiresBook: true,
    modal: 'export',
    aliases: ['导出'],
    surfaces: ['commandPalette']
  },
  {
    id: 'nav.import',
    label: '外部导入章节',
    category: '导航',
    icon: FileUp,
    requiresBook: true,
    modal: 'export',
    aliases: ['导入'],
    surfaces: ['commandPalette']
  },
  {
    id: 'edit.newVolume',
    label: '新建卷',
    category: '编辑',
    icon: Layers,
    requiresBook: true,
    modal: 'newVolume',
    aliases: ['卷'],
    surfaces: ['commandPalette', 'editorContext']
  },
  {
    id: 'edit.newChapter',
    label: '新建章节',
    category: '编辑',
    icon: FilePlus,
    requiresBook: true,
    modal: 'newChapter',
    aliases: ['新章节', '章节'],
    surfaces: ['commandPalette', 'editorContext']
  },
  {
    id: 'edit.newCharacter',
    label: '新建角色',
    category: '编辑',
    icon: UserPlus,
    requiresBook: true,
    aliases: ['人物'],
    surfaces: ['commandPalette', 'editorContext']
  },
  {
    id: 'ai.assistant',
    label: '打开 AI 创作助手',
    category: 'AI',
    icon: Bot,
    requiresBook: true,
    aliases: ['AI', '助手'],
    surfaces: ['commandPalette', 'topbarTools']
  },
  {
    id: 'ai.settings',
    label: 'AI 能力与上下文',
    category: 'AI',
    icon: Settings,
    requiresBook: true,
    modal: 'aiSettings',
    aliases: ['上下文', '能力卡'],
    surfaces: ['commandPalette']
  },
  {
    id: 'view.left',
    label: '切换左侧目录',
    category: '视图',
    icon: PanelLeft,
    requiresBook: true,
    aliases: ['左侧面板', '目录'],
    surfaces: ['commandPalette']
  },
  {
    id: 'view.right',
    label: '切换右侧辅助',
    category: '视图',
    icon: PanelRight,
    requiresBook: true,
    aliases: ['右侧面板', 'AI 面板'],
    surfaces: ['commandPalette']
  },
  {
    id: 'view.bottom',
    label: '切换底部沙盘',
    category: '视图',
    shortcut: formatBottomPanelShortcut(),
    icon: PanelBottom,
    requiresBook: true,
    aliases: ['底栏', '沙盘'],
    surfaces: ['commandPalette']
  },
  {
    id: 'view.blackroom',
    label: '进入小黑屋',
    category: '视图',
    shortcut: 'F11',
    icon: Maximize2,
    requiresBook: true,
    aliases: ['专注模式'],
    surfaces: ['commandPalette']
  },
  { id: 'theme.system', label: '跟随系统外观', category: '主题', icon: Monitor, theme: 'system', surfaces: ['commandPalette'] },
  { id: 'theme.light', label: '冷白浅色', category: '主题', icon: Sun, theme: 'light', surfaces: ['commandPalette'] },
  { id: 'theme.dark', label: '夜间深色', category: '主题', icon: Moon, theme: 'dark', surfaces: ['commandPalette'] },
  { id: 'theme.green', label: '墨绿夜', category: '主题', icon: Leaf, theme: 'dark-green', surfaces: ['commandPalette'] },
  { id: 'theme.blue', label: '深蓝夜', category: '主题', icon: Waves, theme: 'dark-blue', surfaces: ['commandPalette'] },
  { id: 'theme.warm', label: '暖灰', category: '主题', icon: Coffee, theme: 'dark-warm', surfaces: ['commandPalette'] },
  { id: 'theme.oled', label: '纯黑OLED', category: '主题', icon: Smartphone, theme: 'dark-oled', surfaces: ['commandPalette'] },
  {
    id: 'app.settings',
    label: '打开应用设置',
    category: '应用',
    icon: Settings,
    modal: 'appSettings',
    aliases: ['设置', '系统设置'],
    surfaces: ['commandPalette']
  }
]

const actions: Record<WorkspaceCommandId, (ctx: WorkspaceCommandContext, def: WorkspaceCommandDef) => void> = {
  'nav.bookshelf': (ctx) => ctx.closeBook(),
  'nav.commandPalette': (ctx) => ctx.openModal('commandPalette'),
  'nav.globalSearch': (ctx) => ctx.openModal('globalSearch'),
  'nav.bookOverview': openDefModal,
  'nav.fullCharacters': openDefModal,
  'nav.wiki': openDefModal,
  'nav.stats': openDefModal,
  'nav.foreshadowBoard': openDefModal,
  'nav.quickNotes': openDefModal,
  'nav.projectSettings': openDefModal,
  'nav.toolboxHub': openDefModal,
  'nav.writingIntel': openDefModal,
  'nav.marketScan': openDefModal,
  'nav.director': openDefModal,
  'nav.visualStudio': openDefModal,
  'nav.mcp': openDefModal,
  'nav.export': openDefModal,
  'nav.import': openDefModal,
  'edit.newVolume': openDefModal,
  'edit.newChapter': openDefModal,
  'edit.newCharacter': (ctx) => ctx.openModal('character', { isNew: true }),
  'ai.assistant': (ctx) => ctx.openAiAssistant(),
  'ai.settings': openDefModal,
  'view.left': (ctx) => ctx.toggleLeftPanel(),
  'view.right': (ctx) => ctx.toggleRightPanel(),
  'view.bottom': (ctx) => ctx.toggleBottomPanel(),
  'view.blackroom': (ctx) => {
    ctx.setBlackRoomMode(true)
    void window.api.setFullScreen(true)
  },
  'theme.system': setDefTheme,
  'theme.light': setDefTheme,
  'theme.dark': setDefTheme,
  'theme.green': setDefTheme,
  'theme.blue': setDefTheme,
  'theme.warm': setDefTheme,
  'theme.oled': setDefTheme,
  'app.settings': openDefModal
}

function openDefModal(ctx: WorkspaceCommandContext, def: WorkspaceCommandDef) {
  if (def.modal) ctx.openModal(def.modal)
}

function setDefTheme(ctx: WorkspaceCommandContext, def: WorkspaceCommandDef) {
  if (def.theme) ctx.setTheme(def.theme)
}

export function createWorkspaceCommands(ctx: WorkspaceCommandContext): WorkspaceCommand[] {
  return WORKSPACE_COMMAND_REGISTRY.map((def) => ({
    ...def,
    action: () => actions[def.id](ctx, def)
  }))
}

export function getCommandById(id: WorkspaceCommandId): WorkspaceCommandDef {
  const command = WORKSPACE_COMMAND_REGISTRY.find((item) => item.id === id)
  if (!command) throw new Error(`Unknown workspace command: ${id}`)
  return command
}

export function getWorkspaceToolCommands(): WorkspaceCommandDef[] {
  return WORKSPACE_COMMAND_REGISTRY.filter((command) => command.workspaceTool)
}

export function fuzzyCommandMatch(query: string, command: WorkspaceCommandDef): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const targets = [command.label, command.menuLabel, ...(command.aliases ?? [])]
    .filter(Boolean)
    .map((target) => String(target).toLowerCase())

  return targets.some((target) => {
    if (target.includes(q)) return true
    let qi = 0
    for (let i = 0; i < target.length && qi < q.length; i++) {
      if (target[i] === q[qi]) qi++
    }
    return qi === q.length
  })
}
