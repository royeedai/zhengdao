import { create } from 'zustand'

interface GoogleUser {
  id: string
  email: string
  name: string
  picture: string
}

const SYNC_TOGGLE_KEY = 'google_sync_enabled'

interface AuthStore {
  user: GoogleUser | null
  loading: boolean
  syncing: boolean
  syncEnabled: boolean
  lastBookSyncAt: string | null

  loadUser: () => Promise<void>
  loadBookSyncMeta: (bookId: number | null) => Promise<void>
  login: (clientId: string, clientSecret: string) => Promise<boolean>
  logout: () => Promise<void>
  syncUploadBook: (bookId: number) => Promise<void>
  setSyncEnabled: (enabled: boolean) => Promise<void>
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  loading: false,
  syncing: false,
  syncEnabled: false,
  lastBookSyncAt: null,

  loadUser: async () => {
    set({ loading: true })
    try {
      const user = (await window.api.authGetUser()) as GoogleUser | null
      const raw = await window.api.getAppState(SYNC_TOGGLE_KEY)
      const syncEnabled = raw === '1'
      set({ user, syncEnabled })
    } finally {
      set({ loading: false })
    }
  },

  loadBookSyncMeta: async (bookId) => {
    if (bookId == null) {
      set({ lastBookSyncAt: null })
      return
    }
    const raw = await window.api.getAppState(`sync_book_${bookId}`)
    if (!raw) {
      set({ lastBookSyncAt: null })
      return
    }
    try {
      const j = JSON.parse(raw) as { at?: string }
      set({ lastBookSyncAt: j.at ?? null })
    } catch {
      set({ lastBookSyncAt: null })
    }
  },

  login: async (clientId, clientSecret) => {
    set({ loading: true })
    try {
      const user = (await window.api.authLogin(clientId, clientSecret)) as GoogleUser | null
      set({ user })
      return user != null
    } finally {
      set({ loading: false })
    }
  },

  logout: async () => {
    await window.api.authLogout()
    set({ user: null, lastBookSyncAt: null })
  },

  syncUploadBook: async (bookId: number) => {
    set({ syncing: true })
    try {
      await window.api.syncUploadBook(bookId)
      await get().loadBookSyncMeta(bookId)
    } finally {
      set({ syncing: false })
    }
  },

  setSyncEnabled: async (enabled: boolean) => {
    await window.api.setAppState(SYNC_TOGGLE_KEY, enabled ? '1' : '0')
    set({ syncEnabled: enabled })
  }
}))
