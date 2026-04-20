import { create } from 'zustand'
import type { Foreshadowing } from '@/types'

interface ForeshadowStore {
  foreshadowings: Foreshadowing[]
  loading: boolean
  loadForeshadowings: (bookId: number) => Promise<void>
  createForeshadowing: (data: Partial<Foreshadowing> & { book_id: number; text: string }) => Promise<Foreshadowing>
  updateStatus: (id: number, status: Foreshadowing['status']) => Promise<void>
  deleteForeshadowing: (id: number) => Promise<void>
  checkAndUpgrade: (bookId: number, totalWords: number, currentChapter: number) => Promise<void>
  getWarningCount: () => number
}

export const useForeshadowStore = create<ForeshadowStore>((set, get) => ({
  foreshadowings: [],
  loading: false,

  loadForeshadowings: async (bookId) => {
    set({ loading: true })
    try {
      const foreshadowings = await window.api.getForeshadowings(bookId)
      set({ foreshadowings })
    } finally {
      set({ loading: false })
    }
  },

  createForeshadowing: async (data) => {
    const f = await window.api.createForeshadowing(data)
    await get().loadForeshadowings(data.book_id)
    return f
  },

  updateStatus: async (id, status) => {
    await window.api.updateForeshadowingStatus(id, status)
    set({
      foreshadowings: get().foreshadowings.map((f) => (f.id === id ? { ...f, status } : f))
    })
  },

  deleteForeshadowing: async (id) => {
    const f = get().foreshadowings.find((x) => x.id === id)
    await window.api.deleteForeshadowing(id)
    if (f) await get().loadForeshadowings(f.book_id)
  },

  checkAndUpgrade: async (bookId, totalWords, currentChapter) => {
    await window.api.checkForeshadowings(bookId, totalWords, currentChapter)
    await get().loadForeshadowings(bookId)
  },

  getWarningCount: () => {
    return get().foreshadowings.filter((f) => f.status === 'warning').length
  }
}))
