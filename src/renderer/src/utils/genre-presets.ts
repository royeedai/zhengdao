import type { GenrePreset } from '@/types'
import { SEED_GENRE_TEMPLATES } from '../../../shared/genre-template-seeds'

export const GENRE_PRESETS: GenrePreset[] = SEED_GENRE_TEMPLATES.map((preset) => ({
  id: preset.id,
  name: preset.name,
  character_fields: preset.character_fields.map((field) => ({ ...field, options: field.options ? [...field.options] : undefined })),
  faction_labels: preset.faction_labels.map((label) => ({ ...label })),
  status_labels: preset.status_labels.map((label) => ({ ...label })),
  emotion_labels: preset.emotion_labels.map((label) => ({ ...label }))
}))

export function getDefaultPreset(genreId: string): GenrePreset {
  return GENRE_PRESETS.find((p) => p.id === genreId) || GENRE_PRESETS[0]
}

export function getPresetByName(name: string): GenrePreset | undefined {
  return GENRE_PRESETS.find((p) => p.name === name)
}
