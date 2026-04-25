import type { ZhengdaoUser } from '@/stores/auth-store'

const SUPPRESSED_DISPLAY_NAMES = new Set(['线上管理员'])

function getCleanDisplayName(user: ZhengdaoUser | null): string | null {
  const displayName = user?.displayName?.trim()
  if (!displayName || SUPPRESSED_DISPLAY_NAMES.has(displayName)) return null
  return displayName
}

export function hasUserDisplayName(user: ZhengdaoUser | null): boolean {
  return Boolean(getCleanDisplayName(user))
}

export function getUserDisplayName(user: ZhengdaoUser | null): string {
  return getCleanDisplayName(user) || user?.email || ''
}

export function getUserTierLabel(user: ZhengdaoUser | null): string {
  if (!user) return '未登录'
  if (user.tier === 'team') return 'Team'
  if (user.pro || user.tier === 'pro') return 'Pro'
  return 'Free'
}
