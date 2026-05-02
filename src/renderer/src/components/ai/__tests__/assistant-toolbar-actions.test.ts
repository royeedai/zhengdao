import { describe, expect, it } from 'vitest'
import { ASSISTANT_TOOL_ACTIONS, getAssistantToolActionGroups } from '../assistant-toolbar-actions'

describe('assistant toolbar actions', () => {
  it('keeps general AI tools grouped without genre-only actions', () => {
    const groupedIds = getAssistantToolActionGroups(null).flatMap((group) => group.actions.map((action) => action.id))

    expect(groupedIds).toContain('worldConsistency')
    expect(groupedIds).toContain('aiSettings')
    expect(groupedIds).not.toContain('dialogueRewrite')
    expect(groupedIds).not.toContain('citationsManager')
  })

  it('reveals genre-specific tools only for matching work profiles', () => {
    expect(getAssistantToolActionGroups('script').flatMap((group) => group.actions.map((action) => action.id))).toContain(
      'dialogueRewrite'
    )
    expect(
      getAssistantToolActionGroups('academic').flatMap((group) => group.actions.map((action) => action.id))
    ).toContain('citationsManager')
  })

  it('does not duplicate low-frequency tool ids across groups', () => {
    const groupedIds = getAssistantToolActionGroups('script').flatMap((group) => group.actions.map((action) => action.id))
    expect(new Set(groupedIds).size).toBe(groupedIds.length)
    expect(new Set(ASSISTANT_TOOL_ACTIONS.map((action) => action.id)).size).toBe(ASSISTANT_TOOL_ACTIONS.length)
  })
})
