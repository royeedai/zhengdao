import type { ModalType } from '@/types'

export type WorkspaceToolActionId =
  | 'bookOverview'
  | 'fullCharacters'
  | 'settings'
  | 'stats'
  | 'foreshadowBoard'
  | 'quickNotes'
  | 'projectSettings'
  | 'toolboxHub'

export type WorkspaceToolActionGroupId = 'current-work' | 'writing-aids' | 'toolbox'

export interface WorkspaceToolAction {
  id: WorkspaceToolActionId
  label: string
  menuLabel: string
  title: string
  modal: ModalType
  group: WorkspaceToolActionGroupId
  showInPrimaryBar: boolean
  primaryTone: 'accent' | 'neutral'
}

export interface WorkspaceToolActionGroup {
  id: WorkspaceToolActionGroupId
  label: string
  actions: WorkspaceToolAction[]
}

export const WORKSPACE_TOOL_ACTIONS: WorkspaceToolAction[] = [
  {
    id: 'bookOverview',
    label: '总览',
    menuLabel: '总览',
    title: '书籍总览',
    modal: 'bookOverview',
    group: 'current-work',
    showInPrimaryBar: false,
    primaryTone: 'accent'
  },
  {
    id: 'fullCharacters',
    label: '角色总库',
    menuLabel: '角色总库',
    title: '角色总库',
    modal: 'fullCharacters',
    group: 'current-work',
    showInPrimaryBar: true,
    primaryTone: 'neutral'
  },
  {
    id: 'settings',
    label: '设定维基',
    menuLabel: '设定维基',
    title: '设定维基',
    modal: 'settings',
    group: 'current-work',
    showInPrimaryBar: true,
    primaryTone: 'neutral'
  },
  {
    id: 'stats',
    label: '数据',
    menuLabel: '数据中心',
    title: '写作数据中心',
    modal: 'stats',
    group: 'current-work',
    showInPrimaryBar: true,
    primaryTone: 'neutral'
  },
  {
    id: 'foreshadowBoard',
    label: '伏笔看板',
    menuLabel: '伏笔看板',
    title: '伏笔看板',
    modal: 'foreshadowBoard',
    group: 'writing-aids',
    showInPrimaryBar: false,
    primaryTone: 'neutral'
  },
  {
    id: 'quickNotes',
    label: '灵感速记',
    menuLabel: '灵感速记',
    title: '灵感速记',
    modal: 'quickNotes',
    group: 'writing-aids',
    showInPrimaryBar: false,
    primaryTone: 'neutral'
  },
  {
    id: 'projectSettings',
    label: '作品设置',
    menuLabel: '作品设置',
    title: '作品设置',
    modal: 'projectSettings',
    group: 'writing-aids',
    showInPrimaryBar: true,
    primaryTone: 'accent'
  },
  {
    id: 'toolboxHub',
    label: '工具箱',
    menuLabel: '创作工具箱',
    title: '创作工具箱 Hub',
    modal: 'toolboxHub',
    group: 'toolbox',
    showInPrimaryBar: true,
    primaryTone: 'accent'
  }
]

const WORKSPACE_TOOL_GROUP_LABELS: Record<WorkspaceToolActionGroupId, string> = {
  'current-work': '当前作品',
  'writing-aids': '写作辅助',
  toolbox: '创作工具箱'
}

export function getPrimaryWorkspaceToolActions(): WorkspaceToolAction[] {
  return WORKSPACE_TOOL_ACTIONS.filter((action) => action.showInPrimaryBar)
}

export function getWorkspaceToolActionGroups(): WorkspaceToolActionGroup[] {
  const groupIds: WorkspaceToolActionGroupId[] = ['current-work', 'writing-aids', 'toolbox']
  return groupIds
    .map((id) => ({
      id,
      label: WORKSPACE_TOOL_GROUP_LABELS[id],
      actions: WORKSPACE_TOOL_ACTIONS.filter((action) => action.group === id)
    }))
    .filter((group) => group.actions.length > 0)
}
