import type {
  CharacterField,
  EmotionLabel,
  FactionLabel,
  GenrePreset,
  ProjectConfig,
  StatusLabel
} from '@/types'

export interface CustomGenreDraft {
  id: string
  name: string
  character_fields: CharacterField[]
  faction_labels: FactionLabel[]
  status_labels: StatusLabel[]
  emotion_labels: EmotionLabel[]
}

export interface GenreEditorState {
  mode: 'preset' | 'custom'
  builtInGenreId: string
  genreId: string
  genreName: string
  customPreset: CustomGenreDraft
}

function clonePreset(preset: Pick<
  GenrePreset,
  'id' | 'name' | 'character_fields' | 'faction_labels' | 'status_labels' | 'emotion_labels'
>): CustomGenreDraft {
  return {
    id: preset.id,
    name: preset.name,
    character_fields: preset.character_fields.map((field) => ({ ...field, options: field.options ? [...field.options] : undefined })),
    faction_labels: preset.faction_labels.map((label) => ({ ...label })),
    status_labels: preset.status_labels.map((label) => ({ ...label })),
    emotion_labels: preset.emotion_labels.map((label) => ({ ...label }))
  }
}

function normalizeGenreName(value: string): string {
  return value.trim() || '自定义题材'
}

export function deriveGenreEditorState(
  config: Pick<ProjectConfig, 'genre' | 'character_fields' | 'faction_labels' | 'status_labels' | 'emotion_labels'>,
  builtInPresets: GenrePreset[]
): GenreEditorState {
  const builtIn = builtInPresets.find((preset) => preset.id === config.genre)
  if (builtIn) {
    return {
      mode: 'preset',
      builtInGenreId: builtIn.id,
      genreId: builtIn.id,
      genreName: builtIn.name,
      customPreset: clonePreset(builtIn)
    }
  }

  const genreName = normalizeGenreName(config.genre)
  const customPreset: CustomGenreDraft = {
    id: genreName,
    name: genreName,
    character_fields: (config.character_fields || []).map((field) => ({
      ...field,
      options: field.options ? [...field.options] : undefined
    })),
    faction_labels: (config.faction_labels || []).map((label) => ({ ...label })),
    status_labels: (config.status_labels || []).map((label) => ({ ...label })),
    emotion_labels: (config.emotion_labels || []).map((label) => ({ ...label }))
  }

  return {
    mode: 'custom',
    builtInGenreId: builtInPresets[0]?.id ?? 'urban',
    genreId: genreName,
    genreName,
    customPreset
  }
}

export function buildGenreConfigPayload(state: Pick<GenreEditorState, 'mode' | 'builtInGenreId' | 'customPreset'>) {
  if (state.mode === 'preset') {
    return {
      genre: state.builtInGenreId,
      character_fields: state.customPreset.character_fields,
      faction_labels: state.customPreset.faction_labels,
      status_labels: state.customPreset.status_labels,
      emotion_labels: state.customPreset.emotion_labels
    }
  }

  const genre = (state.customPreset.id || normalizeGenreName(state.customPreset.name)).trim()
  return {
    genre,
    character_fields: state.customPreset.character_fields,
    faction_labels: state.customPreset.faction_labels,
    status_labels: state.customPreset.status_labels,
    emotion_labels: state.customPreset.emotion_labels
  }
}
