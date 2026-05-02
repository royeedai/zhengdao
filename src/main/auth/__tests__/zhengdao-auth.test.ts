import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  openExternal: vi.fn(),
  execFile: vi.fn(),
  fetch: vi.fn(),
  appState: new Map<string, string>()
}))

type ExecFileCallback = (error: Error | null, stdout?: string, stderr?: string) => void

vi.mock('node:child_process', () => ({
  execFile: mocks.execFile
}))

vi.mock('electron', () => ({
  shell: {
    openExternal: mocks.openExternal
  }
}))

vi.mock('../../database/app-state-repo', () => ({
  getAppState: vi.fn((key: string) => mocks.appState.get(key) ?? null),
  setAppState: vi.fn((key: string, value: string) => {
    mocks.appState.set(key, value)
  }),
  deleteAppState: vi.fn((key: string) => {
    mocks.appState.delete(key)
  })
}))

function mockDesktopStartResponse(body: { state: string; loginUrl?: string }): void {
  mocks.fetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body)
  } as Response)
}

async function createAuth() {
  const { ZhengdaoAuth } = await import('../zhengdao-auth')
  return new ZhengdaoAuth()
}

function expectedBrowserOpenCommand(url: string): { file: string; args: string[] } {
  if (process.platform === 'win32') return { file: 'rundll32.exe', args: ['url.dll,FileProtocolHandler', url] }
  return { file: 'xdg-open', args: [url] }
}

function mockDefaultBrowserPlist(bundleId = 'com.google.chrome'): string {
  return JSON.stringify({
    LSHandlers: [
      {
        LSHandlerURLScheme: 'https',
        LSHandlerRoleAll: bundleId
      }
    ]
  })
}

function expectBrowserOpen(loginUrl: string): void {
  if (process.platform === 'darwin') {
    expect(mocks.execFile).toHaveBeenCalledWith(
      '/usr/bin/plutil',
      expect.arrayContaining(['-convert', 'json', '-o', '-']),
      expect.any(Function)
    )
    expect(mocks.execFile).toHaveBeenCalledWith(
      '/usr/bin/osascript',
      [
        '-e',
        `tell application id "com.google.chrome" to open location "${loginUrl}"`,
        '-e',
        'tell application id "com.google.chrome" to activate'
      ],
      expect.any(Function)
    )
    return
  }

  const expected = expectedBrowserOpenCommand(loginUrl)
  expect(mocks.execFile).toHaveBeenCalledWith(expected.file, expected.args, expect.any(Function))
}

describe('ZhengdaoAuth login', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
    mocks.openExternal.mockReset()
    mocks.openExternal.mockResolvedValue(undefined)
    mocks.execFile.mockReset()
    mocks.execFile.mockImplementation((_file: string, _args: string[], callback: ExecFileCallback) => {
      callback(null, _file === '/usr/bin/plutil' ? mockDefaultBrowserPlist() : '', '')
    })
    mocks.fetch.mockReset()
    mocks.appState.clear()
    delete process.env.ZHENGDAO_WEBSITE_URL
    delete process.env.ZHENGDAO_API_URL
    vi.stubGlobal('fetch', mocks.fetch)
  })

  it('opens the backend desktop login URL in the system browser and stores the pending state', async () => {
    const loginUrl = 'https://agent.xiangweihu.com/login?client=desktop&desktop_state=state-1'
    mockDesktopStartResponse({ state: 'state-1', loginUrl })

    const result = await (await createAuth()).login()

    expect(result).toEqual({ ok: true, loginUrl })
    expect(mocks.appState.get('zhengdao_auth_pending_state')).toBe('state-1')
    expectBrowserOpen(loginUrl)
    expect(mocks.openExternal).not.toHaveBeenCalled()
  })

  it('rewrites a loopback login URL to the configured official website when the API is not local', async () => {
    mockDesktopStartResponse({
      state: 'state-prod',
      loginUrl: 'http://localhost:3000/login?client=desktop&desktop_state=state-prod'
    })

    const result = await (await createAuth()).login()

    const expected = 'https://agent.xiangweihu.com/login?client=desktop&desktop_state=state-prod'
    expect(result).toEqual({ ok: true, loginUrl: expected })
    expectBrowserOpen(expected)
  })

  it('keeps loopback login URLs for local desktop auth development', async () => {
    process.env.ZHENGDAO_WEBSITE_URL = 'http://localhost:3000'
    process.env.ZHENGDAO_API_URL = 'http://localhost:8787/v1'
    const loginUrl = 'http://localhost:3000/login?client=desktop&desktop_state=state-local'
    mockDesktopStartResponse({ state: 'state-local', loginUrl })

    const result = await (await createAuth()).login()

    expect(result).toEqual({ ok: true, loginUrl })
    expectBrowserOpen(loginUrl)
  })

  it('falls back to a desktop login URL when the backend omits one', async () => {
    mockDesktopStartResponse({ state: 'state-fallback' })

    const result = await (await createAuth()).login()

    const expected = 'https://agent.xiangweihu.com/login?client=desktop&desktop_state=state-fallback'
    expect(result).toEqual({ ok: true, loginUrl: expected })
    expectBrowserOpen(expected)
  })

  it('falls back to Electron shell when the system browser command fails', async () => {
    const loginUrl = 'https://agent.xiangweihu.com/login?client=desktop&desktop_state=state-1'
    mockDesktopStartResponse({ state: 'state-1', loginUrl })
    mocks.execFile.mockImplementation((_file: string, _args: string[], callback: ExecFileCallback) => {
      if (_file === '/usr/bin/plutil') {
        callback(null, mockDefaultBrowserPlist(), '')
        return
      }
      callback(new Error('open failed'))
    })

    const result = await (await createAuth()).login()

    expect(result).toEqual({ ok: true, loginUrl })
    expect(mocks.openExternal).toHaveBeenCalledWith(loginUrl, { activate: true, logUsage: true })
  })
})
