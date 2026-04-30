import { describe, expect, it } from 'vitest'
import {
  BUILTIN_WORKSPACE_LAYOUT_PRESETS,
  chooseDefaultRightPanelTab,
  clampWorkspaceLayoutPanelSizes,
  clampWorkspacePanelWidth,
  createClassicWorkspaceLayoutSnapshot,
  getDefaultWorkspacePanelWidth,
  isRightPanelTab,
  isWorkspaceLayoutPresetId,
  resolveDefaultBottomPanelOpen,
  resolveWorkspaceLayoutPresetSnapshot,
  sanitizeWorkspaceLayoutSnapshot,
  shouldUseCompactWorkspaceLayout,
  terminalHeightToPercent,
  workspacePanelPercentToWidth,
  workspacePanelWidthToPercent
} from '../workspace-layout'

describe('workspace panel layout', () => {
  it('clamps panel widths to ergonomic bounds and viewport share', () => {
    expect(clampWorkspacePanelWidth('left', 80, 1440)).toBe(232)
    expect(clampWorkspacePanelWidth('left', 900, 1024)).toBe(348)
    expect(clampWorkspacePanelWidth('right', 900, 1440)).toBe(604)
  })

  it('provides default panel widths inside the same clamp rules', () => {
    expect(getDefaultWorkspacePanelWidth('left', 1440)).toBe(296)
    expect(getDefaultWorkspacePanelWidth('right', 1440)).toBe(420)
  })

  it('validates right panel tabs', () => {
    expect(isRightPanelTab('foreshadow')).toBe(false)
    expect(isRightPanelTab('characters')).toBe(false)
    expect(isRightPanelTab('notes')).toBe(false)
    expect(isRightPanelTab('ai')).toBe(true)
    expect(isRightPanelTab('outline')).toBe(false)
  })

  it('chooses the AI workbench regardless of old context urgency', () => {
    expect(
      chooseDefaultRightPanelTab({
        warningCount: 1,
        currentChapterCharacterCount: 4
      })
    ).toBe('ai')
    expect(
      chooseDefaultRightPanelTab({
        warningCount: 0,
        currentChapterCharacterCount: 4
      })
    ).toBe('ai')
    expect(
      chooseDefaultRightPanelTab({
        warningCount: 0,
        currentChapterCharacterCount: 0
      })
    ).toBe('ai')
  })

  it('keeps the AI workbench as the only stored tab preference', () => {
    expect(
      chooseDefaultRightPanelTab({
        storedTab: 'ai',
        warningCount: 2,
        currentChapterCharacterCount: 4
      })
    ).toBe('ai')
  })

  it('opens the bottom sandbox by default while respecting stored user preference', () => {
    expect(resolveDefaultBottomPanelOpen(null)).toBe(true)
    expect(resolveDefaultBottomPanelOpen(undefined)).toBe(true)
    expect(resolveDefaultBottomPanelOpen('')).toBe(true)
    expect(resolveDefaultBottomPanelOpen('true')).toBe(true)
    expect(resolveDefaultBottomPanelOpen('false')).toBe(false)
  })

  it('clamps IDE panel percentages and falls back from invalid stored snapshots', () => {
    expect(clampWorkspaceLayoutPanelSizes({ left: 2, right: 99, terminal: Number.NaN })).toEqual({
      left: 12,
      right: 36,
      terminal: 24
    })
    expect(
      sanitizeWorkspaceLayoutSnapshot({
        leftPanelOpen: false,
        rightPanelOpen: true,
        bottomPanelOpen: false,
        sizes: { left: 21, right: 33, terminal: 38 }
      })
    ).toEqual({
      leftPanelOpen: false,
      rightPanelOpen: true,
      bottomPanelOpen: false,
      sizes: { left: 21, right: 33, terminal: 38 }
    })
  })

  it('maps the old pixel-based workspace into a classic 4-pane snapshot', () => {
    expect(
      createClassicWorkspaceLayoutSnapshot({
        leftPanelWidth: 300,
        rightPanelWidth: 420,
        bottomPanelHeight: 240,
        bottomPanelOpen: false,
        viewportWidth: 1500,
        viewportHeight: 1000
      })
    ).toEqual({
      leftPanelOpen: true,
      rightPanelOpen: true,
      bottomPanelOpen: false,
      sizes: {
        left: 20,
        right: 28,
        terminal: 24
      }
    })
  })

  it('resolves built-in and custom IDE layout presets', () => {
    expect(BUILTIN_WORKSPACE_LAYOUT_PRESETS.map((preset) => preset.id)).toEqual([
      'default',
      'focus',
      'review',
      'canon',
      'classic'
    ])
    expect(resolveWorkspaceLayoutPresetSnapshot('focus').leftPanelOpen).toBe(false)
    expect(
      resolveWorkspaceLayoutPresetSnapshot('custom:mine', [
        {
          id: 'custom:mine',
          label: 'Mine',
          description: 'Custom',
          builtin: false,
          snapshot: {
            leftPanelOpen: true,
            rightPanelOpen: false,
            bottomPanelOpen: true,
            sizes: { left: 24, right: 20, terminal: 30 }
          }
        }
      ])
    ).toEqual({
      leftPanelOpen: true,
      rightPanelOpen: false,
      bottomPanelOpen: true,
      sizes: { left: 24, right: 20, terminal: 30 }
    })
  })

  it('validates layout preset ids and compact viewport fallback', () => {
    expect(isWorkspaceLayoutPresetId('default')).toBe(true)
    expect(isWorkspaceLayoutPresetId('custom')).toBe(true)
    expect(isWorkspaceLayoutPresetId('custom:abc')).toBe(true)
    expect(isWorkspaceLayoutPresetId('unknown')).toBe(false)
    expect(shouldUseCompactWorkspaceLayout(1023)).toBe(true)
    expect(shouldUseCompactWorkspaceLayout(1024)).toBe(false)
  })

  it('round-trips panel dimensions between old pixels and IDE percentages', () => {
    expect(workspacePanelWidthToPercent('left', 300, 1500)).toBe(20)
    expect(workspacePanelPercentToWidth('left', 20, 1500)).toBe(300)
    expect(terminalHeightToPercent(180, 1000)).toBe(18)
  })
})
