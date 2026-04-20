import { create } from 'zustand'
import type { ProjectConfig } from '@/types'
import { getDefaultPreset } from '@/utils/genre-presets'

interface ConfigStore {
  config: ProjectConfig | null
  loading: boolean
  loadConfig: (bookId: number) => Promise<void>
  saveConfig: (bookId: number, updates: Partial<ProjectConfig>) => Promise<void>
  initConfig: (bookId: number, genre: string) => Promise<void>
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  config: null,
  loading: false,

  loadConfig: async (bookId) => {
    set({ loading: true })
    try {
      let config = await window.api.getConfig(bookId)
      if (!config) {
        await get().initConfig(bookId, 'urban')
        config = await window.api.getConfig(bookId)
      }
      set({ config })
    } finally {
      set({ loading: false })
    }
  },

  saveConfig: async (bookId, updates) => {
    const current = get().config
    const merged = { ...(current || {}), ...updates }
    await window.api.saveConfig(bookId, merged)
    set({ config: { ...(current || {} as ProjectConfig), ...updates } as ProjectConfig })
  },

  initConfig: async (bookId, genre) => {
    const preset = getDefaultPreset(genre)
    await window.api.saveConfig(bookId, {
      genre,
      character_fields: preset.character_fields,
      faction_labels: preset.faction_labels,
      status_labels: preset.status_labels,
      emotion_labels: preset.emotion_labels,
      daily_goal: 6000,
      sensitive_list: 'default',
      ai_api_key: '',
      ai_api_endpoint: '',
      ai_model: '',
      ai_provider: 'openai'
    })
  }
}))
