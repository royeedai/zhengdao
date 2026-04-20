import { create } from 'zustand'
import type { WikiEntry } from '@/types'

interface WikiStore {
  entries: WikiEntry[]
  categories: string[]
  selectedCategory: string | null
  loading: boolean
  loadCategories: (bookId: number) => Promise<void>
  loadEntries: (bookId: number, category: string) => Promise<void>
  selectCategory: (category: string) => void
  createEntry: (data: Partial<WikiEntry> & { book_id: number; category: string; title: string }) => Promise<WikiEntry>
  updateEntry: (id: number, data: Partial<WikiEntry>) => Promise<void>
  deleteEntry: (id: number) => Promise<void>
}

export const useWikiStore = create<WikiStore>((set, get) => ({
  entries: [],
  categories: [],
  selectedCategory: null,
  loading: false,

  loadCategories: async (bookId) => {
    const categories = await window.api.getWikiCategories(bookId)
    set({ categories })
    if (categories.length > 0 && !get().selectedCategory) {
      set({ selectedCategory: categories[0] })
      await get().loadEntries(bookId, categories[0])
    }
  },

  loadEntries: async (bookId, category) => {
    set({ loading: true })
    try {
      const entries = await window.api.getWikiEntries(bookId, category)
      set({ entries })
    } finally {
      set({ loading: false })
    }
  },

  selectCategory: (category) => set({ selectedCategory: category }),

  createEntry: async (data) => {
    const entry = await window.api.createWikiEntry(data)
    await get().loadCategories(data.book_id)
    await get().loadEntries(data.book_id, data.category)
    return entry
  },

  updateEntry: async (id, data) => {
    await window.api.updateWikiEntry(id, data)
    set({
      entries: get().entries.map((e) => (e.id === id ? { ...e, ...data, updated_at: new Date().toISOString() } : e))
    })
  },

  deleteEntry: async (id) => {
    const entry = get().entries.find((e) => e.id === id)
    await window.api.deleteWikiEntry(id)
    if (entry) {
      await get().loadCategories(entry.book_id)
      await get().loadEntries(entry.book_id, entry.category)
    }
  }
}))
