import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('AppSettingsModal', () => {
  afterEach(() => {
    vi.doUnmock('@/stores/settings-store')
    vi.doUnmock('@/stores/ui-store')
    vi.doUnmock('@/stores/update-store')
    vi.resetModules()
  })

  it('renders the overview while the account state is loading', async () => {
    const { default: AppSettingsModal } = await import('../AppSettingsModal')
    const { useAuthStore } = await import('@/stores/auth-store')

    useAuthStore.setState({ user: null, loading: true })

    expect(() => renderToString(<AppSettingsModal />)).not.toThrow()
  })

  it('renders macOS manual updates as an installer download action', async () => {
    const { createIdleUpdateSnapshot } = await import('../../../../../shared/update')
    // Fixture-only version literal; do not replace with the current release tag
    // every cycle. Real release-tag behavior is covered separately in the
    // updater service tests.
    const snapshot = {
      ...createIdleUpdateSnapshot(),
      status: 'available' as const,
      version: '9.9.9',
      automaticUpdateUnsupportedReason: '当前 macOS 公测包未完成签名与公证',
      manualDownloadUrl: 'https://github.com/royeedai-labs/zhengdao/releases/latest'
    }

    vi.doMock('@/stores/settings-store', () => ({
      useSettingsStore: (selector: (state: { loadSettings: () => Promise<void> }) => unknown) =>
        selector({ loadSettings: vi.fn().mockResolvedValue(undefined) })
    }))
    vi.doMock('@/stores/ui-store', () => ({
      useUIStore: (selector: (state: Record<string, unknown>) => unknown) =>
        selector({
          closeModal: vi.fn(),
          modalData: { tab: 'updates' },
          theme: 'system',
          setTheme: vi.fn()
        })
    }))
    vi.doMock('@/stores/update-store', () => ({
      useUpdateStore: (selector: (state: Record<string, unknown>) => unknown) =>
        selector({
          appVersion: '9.9.0',
          snapshot,
          checkForUpdates: vi.fn(),
          downloadAvailableUpdate: vi.fn(),
          downloadManualInstallerUpdate: vi.fn(),
          installReadyUpdate: vi.fn()
        })
    }))

    const { default: AppSettingsModal } = await import('../AppSettingsModal')
    const html = renderToString(<AppSettingsModal />)

    expect(html).toContain('下载安装包')
    expect(html).toContain('下载完成后会打开 DMG')
    expect(html).not.toContain('打开下载页')
  })
})
