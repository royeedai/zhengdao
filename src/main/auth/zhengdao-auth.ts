import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { shell } from 'electron'
import * as appStateRepo from '../database/app-state-repo'

const WEBSITE_URL = (process.env.ZHENGDAO_WEBSITE_URL || 'https://agent.xiangweihu.com').replace(/\/$/, '')
const API_BASE = (process.env.ZHENGDAO_API_URL || `${WEBSITE_URL}/api/v1`).replace(/\/$/, '')

function execFileAsync(file: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(file, args, (error, stdout, stderr) => {
      if (error) reject(error)
      else resolve({ stdout: String(stdout ?? ''), stderr: String(stderr ?? '') })
    })
  })
}

function getBrowserOpenCommand(url: string): { file: string; args: string[] } {
  if (process.platform === 'win32') return { file: 'rundll32.exe', args: ['url.dll,FileProtocolHandler', url] }
  return { file: 'xdg-open', args: [url] }
}

function escapeAppleScriptString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

async function getDefaultMacBrowserBundleId(): Promise<string | null> {
  const plistPath = join(homedir(), 'Library/Preferences/com.apple.LaunchServices/com.apple.launchservices.secure.plist')
  if (!existsSync(plistPath)) return null

  const { stdout } = await execFileAsync('/usr/bin/plutil', ['-convert', 'json', '-o', '-', plistPath])
  const parsed = JSON.parse(stdout) as {
    LSHandlers?: Array<{
      LSHandlerURLScheme?: string
      LSHandlerRoleAll?: string
    }>
  }
  const handlers = parsed.LSHandlers ?? []
  const handler =
    handlers.find((item) => item.LSHandlerURLScheme === 'https' && item.LSHandlerRoleAll) ??
    handlers.find((item) => item.LSHandlerURLScheme === 'http' && item.LSHandlerRoleAll)
  return handler?.LSHandlerRoleAll ?? null
}

async function openMacUrlInDefaultBrowser(url: string): Promise<void> {
  const bundleId = await getDefaultMacBrowserBundleId()
  if (!bundleId) {
    await execFileAsync('/usr/bin/open', [url])
    return
  }

  const escapedBundleId = escapeAppleScriptString(bundleId)
  const escapedUrl = escapeAppleScriptString(url)
  await execFileAsync('/usr/bin/osascript', [
    '-e',
    `tell application id "${escapedBundleId}" to open location "${escapedUrl}"`,
    '-e',
    `tell application id "${escapedBundleId}" to activate`
  ])
}

function isLoopbackUrl(rawUrl: string): boolean {
  try {
    const { hostname } = new URL(rawUrl)
    const normalized = hostname.replace(/^\[|\]$/g, '')
    return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1'
  } catch {
    return false
  }
}

function buildDesktopLoginUrl(state: string): string {
  const url = new URL('/login', `${WEBSITE_URL}/`)
  url.searchParams.set('client', 'desktop')
  url.searchParams.set('desktop_state', state)
  return url.toString()
}

function resolveDesktopLoginUrl(session: { state: string; loginUrl?: string }): string {
  if (!session.loginUrl) return buildDesktopLoginUrl(session.state)

  try {
    const url = new URL(session.loginUrl)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return buildDesktopLoginUrl(session.state)
    if (isLoopbackUrl(session.loginUrl) && !isLoopbackUrl(API_BASE)) return buildDesktopLoginUrl(session.state)
    return url.toString()
  } catch {
    return buildDesktopLoginUrl(session.state)
  }
}

async function openDesktopLoginInBrowser(loginUrl: string): Promise<void> {
  try {
    if (process.platform === 'darwin') {
      await openMacUrlInDefaultBrowser(loginUrl)
      return
    }
    const command = getBrowserOpenCommand(loginUrl)
    await execFileAsync(command.file, command.args)
  } catch (error) {
    console.warn('[Auth] System browser opener failed, falling back to Electron shell:', error)
    await shell.openExternal(loginUrl, { activate: true, logUsage: true })
  }
}

export interface ZhengdaoUser {
  id: string
  email: string
  displayName?: string | null
  role: 'user' | 'admin'
  tier: 'free' | 'pro' | 'team'
  pro: boolean
  pointsBalance: number
  emailVerified: boolean
}

const KEYS = {
  token: 'zhengdao_auth_token',
  user: 'zhengdao_auth_user',
  pendingState: 'zhengdao_auth_pending_state'
} as const

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  })
  const text = await res.text()
  const payload = text ? JSON.parse(text) as T : ({} as T)
  if (!res.ok) {
    const message = typeof payload === 'object' && payload && 'message' in payload
      ? String((payload as { message?: string }).message)
      : text
    throw new Error(message || `证道账号请求失败 (${res.status})`)
  }
  return payload
}

export class ZhengdaoAuth {
  async login(): Promise<{ ok: boolean; loginUrl?: string; error?: string }> {
    try {
      const session = await apiRequest<{ state: string; loginUrl: string }>('/auth/desktop/start', {
        method: 'POST',
        body: JSON.stringify({})
      })
      appStateRepo.setAppState(KEYS.pendingState, session.state)
      const loginUrl = resolveDesktopLoginUrl(session)
      await openDesktopLoginInBrowser(loginUrl)
      return { ok: true, loginUrl }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  async openUpgradePage(): Promise<void> {
    await shell.openExternal(`${WEBSITE_URL}/pricing?from=desktop#pro-cdk`)
  }

  async openAccountPage(): Promise<void> {
    await shell.openExternal(`${WEBSITE_URL}/app/account`)
  }

  async openCommunityFeedbackPage(): Promise<void> {
    await shell.openExternal(`${WEBSITE_URL}/community/new?category=feedback`)
  }

  async handleCallback(url: string): Promise<ZhengdaoUser> {
    const parsed = new URL(url)
    const state = parsed.searchParams.get('state')
    const code = parsed.searchParams.get('code')
    const expectedState = appStateRepo.getAppState(KEYS.pendingState)
    if (!state || !code || state !== expectedState) throw new Error('证道账号登录回调无效')

    const exchanged = await apiRequest<{ token: string; user: ZhengdaoUser }>('/auth/desktop/exchange', {
      method: 'POST',
      body: JSON.stringify({ state, code })
    })
    appStateRepo.setAppState(KEYS.token, exchanged.token)
    appStateRepo.deleteAppState(KEYS.pendingState)
    const user = await this.refreshUser(exchanged.token)
    return user ?? exchanged.user
  }

  async getUser(): Promise<ZhengdaoUser | null> {
    const token = await this.getAccessToken()
    if (token) {
      const refreshed = await this.refreshUser(token).catch(() => null)
      if (refreshed) return refreshed
    }
    return parseJson<ZhengdaoUser>(appStateRepo.getAppState(KEYS.user))
  }

  async getAccessToken(): Promise<string | null> {
    return appStateRepo.getAppState(KEYS.token)
  }

  async logout(): Promise<void> {
    appStateRepo.deleteAppState(KEYS.token)
    appStateRepo.deleteAppState(KEYS.user)
    appStateRepo.deleteAppState(KEYS.pendingState)
  }

  private async refreshUser(token: string): Promise<ZhengdaoUser | null> {
    const res = await apiRequest<{ user: ZhengdaoUser }>('/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    appStateRepo.setAppState(KEYS.user, JSON.stringify(res.user))
    return res.user
  }
}
