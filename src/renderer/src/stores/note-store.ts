import { create } from 'zustand'
import type { Note } from '@/types'

interface NoteStore {
  bookId: number | null
  notes: Note[]
  loading: boolean
  reset: () => void
  loadNotes: (bookId: number) => Promise<void>
  createNote: (bookId: number, content: string) => Promise<void>
  deleteNote: (bookId: number, id: number) => Promise<void>
}

export const useNoteStore = create<NoteStore>((set) => ({
  bookId: null,
  notes: [],
  loading: false,

  reset: () => {
    set({ bookId: null, notes: [], loading: false })
  },

  loadNotes: async (bookId) => {
    set({ loading: true })
    try {
      const notes = await window.api.getNotes(bookId) as Note[]
      set({ notes, bookId })
    } catch {
      set({ notes: [], bookId })
    } finally {
      set({ loading: false })
    }
  },

  createNote: async (bookId, content) => {
    await window.api.createNote({ book_id: bookId, content })
    const notes = await window.api.getNotes(bookId) as Note[]
    set({ notes, bookId })
  },

  deleteNote: async (bookId, id) => {
    await window.api.deleteNote(id)
    const notes = await window.api.getNotes(bookId) as Note[]
    set({ notes, bookId })
  }
}))
