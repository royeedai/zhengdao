import { create } from 'zustand'
import type { GenreTemplate } from '@/types'
import { normalizeSystemDailyGoal } from '@/utils/daily-goal'

const DEFAULT_DAILY_GOAL = 6000

interface SettingsStore {
  templates: GenreTemplate[]
  templatesLoaded: boolean
  loadingTemplates: boolean
  defaultGenreTemplateId: number | null
  systemDailyGoal: number
  loadSettings: () => Promise<void>
  refreshTemplates: () => Promise<void>
  createGenreTemplate: (data: Record<string, unknown>) => Promise<GenreTemplate | null>
  updateGenreTemplate: (id: number, updates: Record<string, unknown>) => Promise<GenreTemplate | null>
  copyGenreTemplate: (id: number) => Promise<GenreTemplate | null>
  deleteGenreTemplate: (id: number) => Promise<boolean>
  setDefaultGenreTemplateId: (id: number | null) => Promise<void>
  setSystemDailyGoal: (goal: number) => Promise<void>
}

async function readDefaultGenreTemplateId(): Promise<number | null> {
  const raw = await window.api.getAppState('system_default_genre_template_id')
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

async function readSystemDailyGoal(): Promise<number> {
  const raw = await window.api.getAppState('system_default_daily_goal')
  return normalizeSystemDailyGoal(raw, DEFAULT_DAILY_GOAL)
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  templates: [],
  templatesLoaded: false,
  loadingTemplates: false,
  defaultGenreTemplateId: null,
  systemDailyGoal: DEFAULT_DAILY_GOAL,

  loadSettings: async () => {
    set({ loadingTemplates: true })
    try {
      const [templates, defaultGenreTemplateId, systemDailyGoal] = await Promise.all([
        window.api.getGenreTemplates() as Promise<GenreTemplate[]>,
        readDefaultGenreTemplateId(),
        readSystemDailyGoal()
      ])
      set({
        templates,
        templatesLoaded: true,
        defaultGenreTemplateId,
        systemDailyGoal
      })
    } finally {
      set({ loadingTemplates: false })
    }
  },

  refreshTemplates: async () => {
    const [templates, defaultGenreTemplateId] = await Promise.all([
      window.api.getGenreTemplates() as Promise<GenreTemplate[]>,
      readDefaultGenreTemplateId()
    ])
    set({
      templates,
      templatesLoaded: true,
      defaultGenreTemplateId
    })
  },

  createGenreTemplate: async (data) => {
    const created = await window.api.createGenreTemplate(data) as GenreTemplate | null
    await get().refreshTemplates()
    return created
  },

  updateGenreTemplate: async (id, updates) => {
    const updated = await window.api.updateGenreTemplate(id, updates) as GenreTemplate | null
    await get().refreshTemplates()
    return updated
  },

  copyGenreTemplate: async (id) => {
    const copied = await window.api.copyGenreTemplate(id) as GenreTemplate | null
    await get().refreshTemplates()
    return copied
  },

  deleteGenreTemplate: async (id) => {
    const ok = await window.api.deleteGenreTemplate(id) as boolean
    if (ok) {
      if (get().defaultGenreTemplateId === id) {
        await window.api.setAppState('system_default_genre_template_id', '')
      }
      await get().refreshTemplates()
    }
    return ok
  },

  setDefaultGenreTemplateId: async (id) => {
    await window.api.setAppState('system_default_genre_template_id', id ? String(id) : '')
    set({ defaultGenreTemplateId: id })
  },

  setSystemDailyGoal: async (goal) => {
    const normalized = normalizeSystemDailyGoal(goal, DEFAULT_DAILY_GOAL)
    await window.api.setAppState('system_default_daily_goal', String(normalized))
    set({ systemDailyGoal: normalized })
  }
}))
