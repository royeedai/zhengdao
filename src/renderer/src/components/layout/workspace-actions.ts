import type { ModalType } from '@/types'
import {
  getWorkspaceToolCommands,
  type WorkspaceToolGroupId,
  type WorkspaceCommandDef,
  type WorkspaceCommandId
} from '@/commands/workspace-command-registry'

export type WorkspaceToolActionId =
  | 'bookOverview'
  | 'fullCharacters'
  | 'settings'
  | 'stats'
  | 'foreshadowBoard'
  | 'quickNotes'
  | 'projectSettings'
  | 'toolboxHub'

export type WorkspaceToolActionGroupId = WorkspaceToolGroupId

export interface WorkspaceToolAction {
  id: WorkspaceToolActionId
  commandId: WorkspaceCommandId
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

const COMMAND_TO_TOOL_ID: Partial<Record<WorkspaceCommandId, WorkspaceToolActionId>> = {
  'nav.bookOverview': 'bookOverview',
  'nav.fullCharacters': 'fullCharacters',
  'nav.wiki': 'settings',
  'nav.stats': 'stats',
  'nav.foreshadowBoard': 'foreshadowBoard',
  'nav.quickNotes': 'quickNotes',
  'nav.projectSettings': 'projectSettings',
  'nav.toolboxHub': 'toolboxHub'
}

function toWorkspaceToolAction(command: WorkspaceCommandDef): WorkspaceToolAction {
  const id = COMMAND_TO_TOOL_ID[command.id]
  if (!id || !command.workspaceTool || !command.modal) {
    throw new Error(`Command ${command.id} is not a workspace tool action`)
  }
  return {
    id,
    commandId: command.id,
    label: command.label,
    menuLabel: command.menuLabel ?? command.label,
    title: command.menuLabel ?? command.label,
    modal: command.modal,
    group: command.workspaceTool.group,
    showInPrimaryBar: command.workspaceTool.showInPrimaryBar,
    primaryTone: command.workspaceTool.primaryTone
  }
}

export const WORKSPACE_TOOL_ACTIONS: WorkspaceToolAction[] = getWorkspaceToolCommands().map(toWorkspaceToolAction)

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
