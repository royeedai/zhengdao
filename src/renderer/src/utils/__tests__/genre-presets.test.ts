import { describe, it, expect } from 'vitest'
import { getDefaultPreset } from '../genre-presets'

describe('getDefaultPreset', () => {
  it('returns a preset with required fields for "urban"', () => {
    const preset = getDefaultPreset('urban')
    expect(preset).toBeDefined()
    expect(preset.character_fields).toBeDefined()
    expect(preset.faction_labels).toBeDefined()
    expect(preset.status_labels).toBeDefined()
    expect(preset.emotion_labels).toBeDefined()
    expect(Array.isArray(preset.character_fields)).toBe(true)
    expect(Array.isArray(preset.faction_labels)).toBe(true)
  })

  it('returns a valid preset for "fantasy"', () => {
    const preset = getDefaultPreset('fantasy')
    expect(preset).toBeDefined()
    expect(preset.faction_labels.length).toBeGreaterThan(0)
  })

  it('returns fallback preset for unknown genre', () => {
    const preset = getDefaultPreset('nonexistent')
    expect(preset).toBeDefined()
    expect(preset.character_fields).toBeDefined()
  })
})
