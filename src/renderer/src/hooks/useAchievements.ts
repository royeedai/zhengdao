import { useCallback } from 'react'
import { ACHIEVEMENTS } from '@/utils/achievements'
import { useToastStore } from '@/stores/toast-store'

export function useAchievementCheck() {
  const runCheck = useCallback(async (bookId: number) => {
    const stats = (await window.api.getAchievementStats(bookId)) as {
      totalWords: number
      streak: number
      maxDailyWords: number
      totalDays: number
    }
    const unlocked = (await window.api.getUnlockedAchievementTypes(bookId)) as string[]
    const set = new Set(unlocked)
    for (const a of ACHIEVEMENTS) {
      if (set.has(a.type)) continue
      if (!a.check(stats)) continue
      const added = (await window.api.unlockAchievement(bookId, a.type, a.label)) as boolean
      if (added) {
        useToastStore.getState().addToast('success', `成就解锁：${a.label} ${a.icon}`)
      }
    }
  }, [])

  return runCheck
}
