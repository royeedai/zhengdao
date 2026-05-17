import { describe, expect, it } from 'vitest'
import { WORKSPACE_COMMAND_REGISTRY, getWorkspaceToolCommands } from '../workspace-command-registry'

describe('workspace command registry', () => {
  it('keeps command ids unique', () => {
    const ids = WORKSPACE_COMMAND_REGISTRY.map((command) => command.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('covers every topbar workspace tool through the command registry', () => {
    expect(getWorkspaceToolCommands().map((command) => command.id)).toEqual([
      'nav.bookOverview',
      'nav.fullCharacters',
      'nav.wiki',
      'nav.stats',
      'nav.foreshadowBoard',
      'nav.quickNotes',
      'nav.projectSettings',
      'nav.toolboxHub'
    ])
  })

  it('exposes command and content search as globally available actions', () => {
    const actions = WORKSPACE_COMMAND_REGISTRY.filter((command) =>
      ['nav.commandPalette', 'nav.globalSearch', 'app.settings'].includes(command.id)
    )
    expect(actions.every((command) => !command.requiresBook)).toBe(true)
  })
})
