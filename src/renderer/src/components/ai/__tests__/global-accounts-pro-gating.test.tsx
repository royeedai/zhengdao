import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ZhengdaoUser } from '@/stores/auth-store'

function makeUser(patch: Partial<ZhengdaoUser> = {}): ZhengdaoUser {
  return {
    id: 'user-1',
    email: 'author@example.com',
    role: 'user',
    tier: 'free',
    pro: false,
    pointsBalance: 0,
    emailVerified: true,
    ...patch
  }
}

describe('AiGlobalAccountsSettings Pro gating', () => {
  afterEach(() => {
    vi.doUnmock('@/stores/auth-store')
    vi.resetModules()
  })

  async function renderWithUser(user: ZhengdaoUser) {
    vi.doMock('@/stores/auth-store', () => ({
      useAuthStore: (selector: (state: { user: ZhengdaoUser; loadUser: () => Promise<void> }) => unknown) =>
        selector({ user, loadUser: vi.fn().mockResolvedValue(undefined) })
    }))
    const { default: AiGlobalAccountsSettings } = await import('../AiGlobalAccountsSettings')
    return renderToString(<AiGlobalAccountsSettings />)
  }

  it('shows an upgrade gate for Free accounts while keeping third-party model settings visible', async () => {
    const html = await renderWithUser(makeUser())

    expect(html).toContain('官方 AI 需要 Pro 权益')
    expect(html).toContain('高级 / 自定义第三方模型')
  })

  it('shows the official AI area for Pro accounts without the upgrade gate', async () => {
    const html = await renderWithUser(makeUser({ tier: 'pro', pro: true }))

    expect(html).toContain('官方 AI')
    expect(html).toContain('当前没有后台启用的官方 AI 配置')
    expect(html).not.toContain('官方 AI 需要 Pro 权益')
  })
})
