import { useCallback, useEffect, useState } from 'react'
import { useBookStore } from '@/stores/book-store'

export function useWritingStreak() {
  const bookId = useBookStore((s) => s.currentBookId)
  const [streak, setStreak] = useState(0)

  const refresh = useCallback(async () => {
    if (!bookId) {
      setStreak(0)
      return
    }
    const stats = (await window.api.getAchievementStats(bookId)) as { streak: number }
    setStreak(stats.streak)
  }, [bookId])

  useEffect(() => {
    void refresh()
    const id = setInterval(refresh, 60_000)
    return () => clearInterval(id)
  }, [refresh])

  return { streak, refresh }
}
