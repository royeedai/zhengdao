import { BrowserWindow } from 'electron'
import http from 'http'
import crypto from 'crypto'
import * as appStateRepo from '../database/app-state-repo'
import { getAuxiliaryWindowShellOptions } from '../window-shell'

const REDIRECT_PORT = 48372
const REDIRECT_URI = `http://127.0.0.1:${REDIRECT_PORT}/callback`

const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.appdata'
]

export interface GoogleTokens {
  access_token: string
  refresh_token?: string
  expires_at: number
  id_token?: string
}

export interface GoogleUserInfo {
  id: string
  email: string
  name: string
  picture: string
}

const KEYS = {
  tokens: 'google_tokens',
  user: 'google_user',
  clientId: 'google_client_id',
  clientSecret: 'google_client_secret'
} as const

function base64Url(bytes: Buffer): string {
  return bytes
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

async function postForm(url: string, body: Record<string, string>): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: new URLSearchParams(body).toString()
  })
  const text = await res.text()
  let data: Record<string, unknown>
  try {
    data = JSON.parse(text) as Record<string, unknown>
  } catch {
    throw new Error(`Token request failed: ${res.status} ${text}`)
  }
  if (!res.ok) {
    const err = (data.error_description as string) || (data.error as string) || text
    throw new Error(err)
  }
  return data
}

export class GoogleAuth {
  private oauthServer: http.Server | null = null

  private stopOAuthServer(): void {
    if (this.oauthServer) {
      try {
        this.oauthServer.close()
      } catch {
        void 0
      }
      this.oauthServer = null
    }
  }

  async login(clientId: string, clientSecret: string): Promise<GoogleUserInfo | null> {
    if (!clientId?.trim() || !clientSecret?.trim()) return null

    appStateRepo.setAppState(KEYS.clientId, clientId.trim())
    appStateRepo.setAppState(KEYS.clientSecret, clientSecret.trim())

    const codeVerifier = base64Url(crypto.randomBytes(32))
    const codeChallenge = base64Url(crypto.createHash('sha256').update(codeVerifier).digest())
    const oauthState = base64Url(crypto.randomBytes(16))

    const authUrl =
      'https://accounts.google.com/o/oauth2/v2/auth?' +
      new URLSearchParams({
        client_id: clientId.trim(),
        redirect_uri: REDIRECT_URI,
        response_type: 'code',
        scope: SCOPES.join(' '),
        state: oauthState,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        access_type: 'offline',
        prompt: 'consent'
      }).toString()

    const codePromise = this.waitForCallback(oauthState)
    const authWin = new BrowserWindow({
      width: 520,
      height: 720,
      show: true,
      ...getAuxiliaryWindowShellOptions(process.platform, '证道 · Google 登录'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    try {
      await authWin.loadURL(authUrl)
      let code: string
      try {
        const result = await codePromise
        code = result.code
      } finally {
        if (!authWin.isDestroyed()) authWin.close()
      }

      const tokenBody = await postForm('https://oauth2.googleapis.com/token', {
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: clientId.trim(),
        client_secret: clientSecret.trim(),
        code_verifier: codeVerifier
      })

      const expiresIn = Number(tokenBody.expires_in) || 3600
      const tokens: GoogleTokens = {
        access_token: String(tokenBody.access_token),
        refresh_token: tokenBody.refresh_token ? String(tokenBody.refresh_token) : undefined,
        expires_at: Date.now() + expiresIn * 1000 - 60_000,
        id_token: tokenBody.id_token ? String(tokenBody.id_token) : undefined
      }

      const prev = parseJson<GoogleTokens>(appStateRepo.getAppState(KEYS.tokens))
      if (!tokens.refresh_token && prev?.refresh_token) {
        tokens.refresh_token = prev.refresh_token
      }

      appStateRepo.setAppState(KEYS.tokens, JSON.stringify(tokens))

      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      })
      if (!userRes.ok) {
        throw new Error(`userinfo failed: ${userRes.status}`)
      }
      const userRaw = (await userRes.json()) as Record<string, unknown>
      const user: GoogleUserInfo = {
        id: String(userRaw.id ?? ''),
        email: String(userRaw.email ?? ''),
        name: String(userRaw.name ?? ''),
        picture: String(userRaw.picture ?? '')
      }
      appStateRepo.setAppState(KEYS.user, JSON.stringify(user))
      return user
    } catch (e) {
      this.stopOAuthServer()
      if (!authWin.isDestroyed()) authWin.close()
      console.error('[GoogleAuth] login failed', e)
      return null
    }
  }

  private waitForCallback(expectedState: string): Promise<{ code: string }> {
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        try {
          const base = `http://127.0.0.1:${REDIRECT_PORT}`
          const u = new URL(req.url || '/', base)
          if (u.pathname !== '/callback') {
            res.writeHead(404)
            res.end()
            return
          }
          const err = u.searchParams.get('error')
          if (err) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
            res.end('<!doctype html><meta charset="utf-8"><p>登录已取消或失败，请关闭窗口。</p>')
            finish(new Error(u.searchParams.get('error_description') || err))
            return
          }
          const state = u.searchParams.get('state')
          const code = u.searchParams.get('code')
          if (state !== expectedState) {
            res.writeHead(400, { 'Content-Type': 'text/plain' })
            res.end('Invalid state')
            finish(new Error('Invalid OAuth state'))
            return
          }
          if (!code) {
            res.writeHead(400)
            res.end('Missing code')
            finish(new Error('Missing authorization code'))
            return
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end('<!doctype html><meta charset="utf-8"><p>登录成功，请返回应用。</p>')
          finish(null, code)
        } catch (e) {
          finish(e instanceof Error ? e : new Error(String(e)))
        }
      })

      this.oauthServer = server

      let settled = false
      const finish = (err: Error | null, code?: string) => {
        if (settled) return
        settled = true
        server.close(() => {
          if (this.oauthServer === server) this.oauthServer = null
          if (err) reject(err)
          else if (code) resolve({ code })
          else reject(new Error('OAuth finished without code'))
        })
      }

      server.on('error', (e) => finish(e))

      let timeoutId: ReturnType<typeof setTimeout> | undefined
      server.on('close', () => {
        if (timeoutId !== undefined) clearTimeout(timeoutId)
      })

      server.listen(REDIRECT_PORT, '127.0.0.1', () => {
        timeoutId = setTimeout(() => {
          finish(new Error('OAuth timed out'))
        }, 600_000)
      })
    })
  }

  async getUser(): Promise<GoogleUserInfo | null> {
    return parseJson<GoogleUserInfo>(appStateRepo.getAppState(KEYS.user))
  }

  private getClientCreds(): { clientId: string; clientSecret: string } | null {
    const clientId = appStateRepo.getAppState(KEYS.clientId)
    const clientSecret = appStateRepo.getAppState(KEYS.clientSecret)
    if (!clientId || !clientSecret) return null
    return { clientId, clientSecret }
  }

  async getAccessToken(): Promise<string | null> {
    const tokens = parseJson<GoogleTokens>(appStateRepo.getAppState(KEYS.tokens))
    if (!tokens?.access_token) return null

    if (tokens.expires_at > Date.now()) {
      return tokens.access_token
    }

    const creds = this.getClientCreds()
    if (!creds || !tokens.refresh_token) return null

    try {
      const next = await this.refreshToken(creds.clientId, creds.clientSecret, tokens.refresh_token)
      const merged: GoogleTokens = {
        ...next,
        refresh_token: next.refresh_token ?? tokens.refresh_token
      }
      appStateRepo.setAppState(KEYS.tokens, JSON.stringify(merged))
      return merged.access_token
    } catch (e) {
      console.error('[GoogleAuth] refresh failed', e)
      return null
    }
  }

  async logout(): Promise<void> {
    appStateRepo.deleteAppState(KEYS.tokens)
    appStateRepo.deleteAppState(KEYS.user)
  }

  private async refreshToken(
    clientId: string,
    clientSecret: string,
    refreshToken: string
  ): Promise<GoogleTokens> {
    const data = await postForm('https://oauth2.googleapis.com/token', {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret
    })
    const expiresIn = Number(data.expires_in) || 3600
    return {
      access_token: String(data.access_token),
      refresh_token: data.refresh_token ? String(data.refresh_token) : undefined,
      expires_at: Date.now() + expiresIn * 1000 - 60_000,
      id_token: data.id_token ? String(data.id_token) : undefined
    }
  }
}
