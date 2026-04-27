import { describe, expect, it } from 'vitest'
import { getUserDisplayName, getUserTierLabel, hasProEntitlement, hasUserDisplayName } from '@/utils/auth-display'
import type { ZhengdaoUser } from '@/stores/auth-store'

function makeUser(patch: Partial<ZhengdaoUser> = {}): ZhengdaoUser {
  return {
    id: 'user-1',
    email: 'admin@agent.xiangweihu.com',
    role: 'admin',
    tier: 'free',
    pro: false,
    pointsBalance: 0,
    emailVerified: true,
    ...patch
  }
}

describe('auth display helpers', () => {
  it('uses email directly when the account has no real display name', () => {
    const user = makeUser({ displayName: null })

    expect(getUserDisplayName(user)).toBe('admin@agent.xiangweihu.com')
    expect(hasUserDisplayName(user)).toBe(false)
  })

  it('suppresses the legacy online-admin placeholder name', () => {
    const user = makeUser({ displayName: '线上管理员' })

    expect(getUserDisplayName(user)).toBe('admin@agent.xiangweihu.com')
    expect(hasUserDisplayName(user)).toBe(false)
  })

  it('shows user-side tier labels without exposing admin role labels', () => {
    expect(getUserTierLabel(makeUser())).toBe('Free')
    expect(getUserTierLabel(makeUser({ pro: true }))).toBe('Pro')
    expect(getUserTierLabel(makeUser({ tier: 'team', pro: true }))).toBe('Team')
  })

  it('uses account entitlement for Pro feature visibility', () => {
    expect(hasProEntitlement(null)).toBe(false)
    expect(hasProEntitlement(makeUser())).toBe(false)
    expect(hasProEntitlement(makeUser({ pro: true }))).toBe(true)
    expect(hasProEntitlement(makeUser({ tier: 'pro' }))).toBe(true)
    expect(hasProEntitlement(makeUser({ tier: 'team' }))).toBe(true)
  })
})
