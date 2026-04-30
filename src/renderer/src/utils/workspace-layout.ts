export type WorkspacePanelKind = 'left' | 'right'
export type RightPanelTab = 'ai'
export type WorkspaceLayoutPanelKind = 'left' | 'right' | 'terminal'
export type WorkspaceLayoutBuiltinPresetId = 'default' | 'focus' | 'review' | 'canon' | 'classic'
export type WorkspaceLayoutPresetId = WorkspaceLayoutBuiltinPresetId | 'custom' | `custom:${string}`

export interface WorkspaceLayoutPanelSizes {
  left: number
  right: number
  terminal: number
}

export interface WorkspaceLayoutSnapshot {
  leftPanelOpen: boolean
  rightPanelOpen: boolean
  bottomPanelOpen: boolean
  sizes: WorkspaceLayoutPanelSizes
}

export interface WorkspaceLayoutPresetDefinition {
  id: WorkspaceLayoutPresetId
  label: string
  description: string
  snapshot: WorkspaceLayoutSnapshot
  builtin: boolean
}

export const RIGHT_PANEL_TABS: RightPanelTab[] = ['ai']

const PANEL_LIMITS: Record<WorkspacePanelKind, { min: number; max: number; fallback: number; viewportRatio: number }> =
  {
    left: { min: 232, max: 420, fallback: 296, viewportRatio: 0.34 },
    right: { min: 360, max: 640, fallback: 420, viewportRatio: 0.42 }
  }

const IDE_PANEL_LIMITS: Record<WorkspaceLayoutPanelKind, { min: number; max: number; fallback: number }> = {
  left: { min: 12, max: 28, fallback: 18 },
  right: { min: 18, max: 36, fallback: 28 },
  terminal: { min: 18, max: 44, fallback: 24 }
}

export const COMPACT_WORKSPACE_LAYOUT_WIDTH = 1024

export const DEFAULT_WORKSPACE_LAYOUT_PANEL_SIZES: WorkspaceLayoutPanelSizes = {
  left: IDE_PANEL_LIMITS.left.fallback,
  right: IDE_PANEL_LIMITS.right.fallback,
  terminal: IDE_PANEL_LIMITS.terminal.fallback
}

export const BUILTIN_WORKSPACE_LAYOUT_PRESETS: WorkspaceLayoutPresetDefinition[] = [
  {
    id: 'default',
    label: '默认',
    description: '目录、编辑器、AI、Terminal 全开',
    builtin: true,
    snapshot: {
      leftPanelOpen: true,
      rightPanelOpen: true,
      bottomPanelOpen: true,
      sizes: { left: 18, right: 28, terminal: 24 }
    }
  },
  {
    id: 'focus',
    label: '专注',
    description: '只保留编辑器',
    builtin: true,
    snapshot: {
      leftPanelOpen: false,
      rightPanelOpen: false,
      bottomPanelOpen: false,
      sizes: { left: 18, right: 28, terminal: 24 }
    }
  },
  {
    id: 'review',
    label: '审阅',
    description: '放大 AI 与底部审阅区',
    builtin: true,
    snapshot: {
      leftPanelOpen: true,
      rightPanelOpen: true,
      bottomPanelOpen: true,
      sizes: { left: 15, right: 34, terminal: 22 }
    }
  },
  {
    id: 'canon',
    label: '设定',
    description: '左侧资料与右侧 AI 协同',
    builtin: true,
    snapshot: {
      leftPanelOpen: true,
      rightPanelOpen: true,
      bottomPanelOpen: false,
      sizes: { left: 22, right: 34, terminal: 24 }
    }
  },
  {
    id: 'classic',
    label: '经典',
    description: '沿用旧版工作区比例',
    builtin: true,
    snapshot: {
      leftPanelOpen: true,
      rightPanelOpen: true,
      bottomPanelOpen: true,
      sizes: { left: 20, right: 28, terminal: 24 }
    }
  }
]

function roundFinite(value: number): number {
  return Math.round(Number.isFinite(value) ? value : 0)
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min
  return Math.min(Math.max(value, min), max)
}

function clampPercent(kind: WorkspaceLayoutPanelKind, value: number): number {
  const limits = IDE_PANEL_LIMITS[kind]
  const numeric = Number.isFinite(value) ? value : limits.fallback
  return clamp(Math.round(numeric), limits.min, limits.max)
}

export function clampWorkspacePanelWidth(kind: WorkspacePanelKind, width: number, viewportWidth = 1440): number {
  const limits = PANEL_LIMITS[kind]
  const maxByViewport = Math.max(limits.min, Math.floor(roundFinite(viewportWidth) * limits.viewportRatio))
  return clamp(roundFinite(width), limits.min, Math.min(limits.max, maxByViewport))
}

export function getDefaultWorkspacePanelWidth(kind: WorkspacePanelKind, viewportWidth = 1440): number {
  return clampWorkspacePanelWidth(kind, PANEL_LIMITS[kind].fallback, viewportWidth)
}

export function workspacePanelWidthToPercent(kind: WorkspacePanelKind, width: number, viewportWidth = 1440): number {
  const percent = (roundFinite(width) / Math.max(1, roundFinite(viewportWidth))) * 100
  return clampPercent(kind, percent)
}

export function workspacePanelPercentToWidth(kind: WorkspacePanelKind, percent: number, viewportWidth = 1440): number {
  const width = (clampPercent(kind, percent) / 100) * Math.max(1, roundFinite(viewportWidth))
  return clampWorkspacePanelWidth(kind, width, viewportWidth)
}

export function terminalHeightToPercent(height: number, viewportHeight = 900): number {
  const percent = (roundFinite(height) / Math.max(1, roundFinite(viewportHeight))) * 100
  return clampPercent('terminal', percent)
}

export function terminalPercentToHeight(percent: number, viewportHeight = 900): number {
  const clamped = clampPercent('terminal', percent)
  return Math.round((clamped / 100) * Math.max(1, roundFinite(viewportHeight)))
}

export function clampWorkspaceLayoutPanelSizes(
  sizes: Partial<WorkspaceLayoutPanelSizes> | null | undefined
): WorkspaceLayoutPanelSizes {
  return {
    left: clampPercent('left', sizes?.left ?? DEFAULT_WORKSPACE_LAYOUT_PANEL_SIZES.left),
    right: clampPercent('right', sizes?.right ?? DEFAULT_WORKSPACE_LAYOUT_PANEL_SIZES.right),
    terminal: clampPercent('terminal', sizes?.terminal ?? DEFAULT_WORKSPACE_LAYOUT_PANEL_SIZES.terminal)
  }
}

export function sanitizeWorkspaceLayoutSnapshot(
  snapshot: Partial<WorkspaceLayoutSnapshot> | null | undefined
): WorkspaceLayoutSnapshot {
  return {
    leftPanelOpen: typeof snapshot?.leftPanelOpen === 'boolean' ? snapshot.leftPanelOpen : true,
    rightPanelOpen: typeof snapshot?.rightPanelOpen === 'boolean' ? snapshot.rightPanelOpen : true,
    bottomPanelOpen: typeof snapshot?.bottomPanelOpen === 'boolean' ? snapshot.bottomPanelOpen : true,
    sizes: clampWorkspaceLayoutPanelSizes(snapshot?.sizes)
  }
}

export function createClassicWorkspaceLayoutSnapshot(
  input: {
    leftPanelWidth?: number
    rightPanelWidth?: number
    bottomPanelHeight?: number
    bottomPanelOpen?: boolean
    viewportWidth?: number
    viewportHeight?: number
  } = {}
): WorkspaceLayoutSnapshot {
  const viewportWidth = input.viewportWidth ?? 1440
  const viewportHeight = input.viewportHeight ?? 900
  return {
    leftPanelOpen: true,
    rightPanelOpen: true,
    bottomPanelOpen: input.bottomPanelOpen ?? true,
    sizes: {
      left: workspacePanelWidthToPercent('left', input.leftPanelWidth ?? PANEL_LIMITS.left.fallback, viewportWidth),
      right: workspacePanelWidthToPercent('right', input.rightPanelWidth ?? PANEL_LIMITS.right.fallback, viewportWidth),
      terminal: terminalHeightToPercent(input.bottomPanelHeight ?? 320, viewportHeight)
    }
  }
}

export function resolveWorkspaceLayoutPresetSnapshot(
  presetId: WorkspaceLayoutPresetId,
  customPresets: WorkspaceLayoutPresetDefinition[] = [],
  classicSnapshot?: WorkspaceLayoutSnapshot
): WorkspaceLayoutSnapshot {
  if (presetId === 'classic' && classicSnapshot) return sanitizeWorkspaceLayoutSnapshot(classicSnapshot)
  const preset = [...BUILTIN_WORKSPACE_LAYOUT_PRESETS, ...customPresets].find((item) => item.id === presetId)
  return sanitizeWorkspaceLayoutSnapshot(preset?.snapshot ?? BUILTIN_WORKSPACE_LAYOUT_PRESETS[0].snapshot)
}

export function isWorkspaceLayoutPresetId(value: string): value is WorkspaceLayoutPresetId {
  return (
    value === 'custom' ||
    value.startsWith('custom:') ||
    BUILTIN_WORKSPACE_LAYOUT_PRESETS.some((preset) => preset.id === value)
  )
}

export function shouldUseCompactWorkspaceLayout(viewportWidth = 1440): boolean {
  return roundFinite(viewportWidth) < COMPACT_WORKSPACE_LAYOUT_WIDTH
}

export function resolveDefaultBottomPanelOpen(storedValue: string | null | undefined): boolean {
  if (storedValue === 'false') return false
  if (storedValue === 'true') return true
  return true
}

export function isRightPanelTab(value: string): value is RightPanelTab {
  return (RIGHT_PANEL_TABS as readonly string[]).includes(value)
}

export function chooseDefaultRightPanelTab(input: {
  storedTab?: RightPanelTab | null
  warningCount: number
  currentChapterCharacterCount: number
}): RightPanelTab {
  void input
  return 'ai'
}
