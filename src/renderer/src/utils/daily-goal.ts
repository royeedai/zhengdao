import type { ProjectConfig } from '@/types'

export function normalizeSystemDailyGoal(value: unknown, fallback = 6000): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.max(100, Math.round(parsed))
}

export function resolveProjectDailyGoal(
  config: Pick<ProjectConfig, 'daily_goal' | 'daily_goal_mode'> | null | undefined,
  systemDefaultDailyGoal: number
): number {
  const normalizedSystem = normalizeSystemDailyGoal(systemDefaultDailyGoal)
  if (!config) return normalizedSystem
  if (config.daily_goal_mode === 'custom') {
    return normalizeSystemDailyGoal(config.daily_goal, normalizedSystem)
  }
  return normalizedSystem
}
