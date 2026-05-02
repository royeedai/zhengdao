import { describe, expect, it } from 'vitest'
import {
  WORKSPACE_TOOL_ACTIONS,
  getPrimaryWorkspaceToolActions,
  getWorkspaceToolActionGroups
} from '../workspace-actions'

describe('workspace tool actions', () => {
  it('keeps the topbar primary tools as a subset of the shared menu actions', () => {
    expect(getPrimaryWorkspaceToolActions().map((action) => action.id)).toEqual([
      'fullCharacters',
      'settings',
      'stats',
      'projectSettings'
    ])

    const groupedIds = getWorkspaceToolActionGroups().flatMap((group) => group.actions.map((action) => action.id))
    expect(new Set(groupedIds)).toEqual(new Set(WORKSPACE_TOOL_ACTIONS.map((action) => action.id)))
  })

  it('keeps action labels and modal targets in one metadata source', () => {
    const overview = WORKSPACE_TOOL_ACTIONS.find((action) => action.id === 'bookOverview')
    const projectSettings = WORKSPACE_TOOL_ACTIONS.find((action) => action.id === 'projectSettings')

    expect(overview).toMatchObject({
      label: '总览',
      menuLabel: '总览',
      modal: 'bookOverview',
      showInPrimaryBar: false
    })
    expect(projectSettings).toMatchObject({
      label: '作品设置',
      modal: 'projectSettings',
      showInPrimaryBar: true,
      primaryTone: 'accent'
    })
  })
})
