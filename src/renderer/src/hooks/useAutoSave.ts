import { useEffect, useRef, useCallback } from 'react'
import { useChapterStore } from '@/stores/chapter-store'
import { useBookStore } from '@/stores/book-store'

export function useAutoSave() {
  const currentChapter = useChapterStore((s) => s.currentChapter)
  const bookId = useBookStore((s) => s.currentBookId)

  const saveDraft = useCallback(
    (chapterId: number, html: string) => {
      try {
        localStorage.setItem(`draft_${chapterId}`, html)
      } catch {}
    },
    []
  )

  const clearDraft = useCallback((chapterId: number) => {
    try {
      localStorage.removeItem(`draft_${chapterId}`)
    } catch {}
  }, [])

  const getDraft = useCallback((chapterId: number): string | null => {
    try {
      return localStorage.getItem(`draft_${chapterId}`)
    } catch {
      return null
    }
  }, [])

  return { saveDraft, clearDraft, getDraft }
}
