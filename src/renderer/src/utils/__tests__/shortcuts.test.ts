import { describe, expect, it } from 'vitest'
import { defaultChordForAction, matchesShortcutChord } from '../shortcuts'

function keyEvent(init: Partial<KeyboardEvent>): KeyboardEvent {
  return init as KeyboardEvent
}

describe('workspace shortcuts', () => {
  it('keeps global search on the visible Ctrl/Cmd+P shortcut', () => {
    expect(defaultChordForAction('globalSearch')).toBe('Ctrl+P')
    expect(matchesShortcutChord(keyEvent({ key: 'p', metaKey: true, ctrlKey: false, shiftKey: false, altKey: false }), 'Ctrl+P')).toBe(true)
    expect(matchesShortcutChord(keyEvent({ key: 'p', metaKey: false, ctrlKey: true, shiftKey: false, altKey: false }), 'Ctrl+P')).toBe(true)
    expect(matchesShortcutChord(keyEvent({ key: 'f', metaKey: true, ctrlKey: false, shiftKey: true, altKey: false }), 'Ctrl+P')).toBe(false)
  })
})
