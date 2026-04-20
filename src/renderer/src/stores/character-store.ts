import { create } from 'zustand'
import type { Character, CharacterAppearance } from '@/types'

interface CharacterStore {
  characters: Character[]
  loading: boolean
  loadCharacters: (bookId: number) => Promise<void>
  createCharacter: (data: Partial<Character> & { book_id: number; name: string }) => Promise<Character>
  updateCharacter: (id: number, data: Partial<Character>) => Promise<void>
  deleteCharacter: (id: number) => Promise<void>
  getAppearances: (characterId: number) => Promise<CharacterAppearance[]>
  syncAppearances: (chapterId: number, characterIds: number[]) => Promise<void>
}

export const useCharacterStore = create<CharacterStore>((set, get) => ({
  characters: [],
  loading: false,

  loadCharacters: async (bookId) => {
    set({ loading: true })
    try {
      const characters = await window.api.getCharacters(bookId)
      set({ characters })
    } finally {
      set({ loading: false })
    }
  },

  createCharacter: async (data) => {
    const char = await window.api.createCharacter(data)
    await get().loadCharacters(data.book_id)
    return char
  },

  updateCharacter: async (id, data) => {
    await window.api.updateCharacter(id, data)
    set({
      characters: get().characters.map((c) => (c.id === id ? { ...c, ...data } : c))
    })
  },

  deleteCharacter: async (id) => {
    const char = get().characters.find((c) => c.id === id)
    await window.api.deleteCharacter(id)
    if (char) await get().loadCharacters(char.book_id)
  },

  getAppearances: async (characterId) => {
    return await window.api.getCharacterAppearances(characterId)
  },

  syncAppearances: async (chapterId, characterIds) => {
    await window.api.syncAppearances(chapterId, characterIds)
  }
}))
