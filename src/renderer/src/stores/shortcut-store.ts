import { create } from 'zustand'
import { defaultChordForAction } from '@/utils/shortcuts'

interface ShortcutStore {
  overrides: Record<string, string>
  loaded: boolean
  load: () => Promise<void>
  getChord: (actionId: string) => string
  setChord: (actionId: string, keys: string) => Promise<void>
}

export const useShortcutStore = create<ShortcutStore>((set, get) => ({
  overrides: {},
  loaded: false,

  load: async () => {
    const rows = (await window.api.getCustomShortcuts()) as Record<string, string>
    set({ overrides: rows ?? {}, loaded: true })
  },

  getChord: (actionId) => {
    const custom = get().overrides[actionId]?.trim()
    if (custom) return custom
    return defaultChordForAction(actionId)
  },

  setChord: async (actionId, keys) => {
    await window.api.setCustomShortcut(actionId, keys.trim())
    set((s) => {
      const next = { ...s.overrides }
      if (!keys.trim()) delete next[actionId]
      else next[actionId] = keys.trim()
      return { overrides: next }
    })
  }
}))
