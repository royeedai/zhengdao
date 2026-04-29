import { ZhengdaoAuth, type ZhengdaoUser } from '../auth/zhengdao-auth'
import { CloudSync } from '../sync/cloud-sync'
import { SearchRepo } from '../database/search-repo'
import {
  createGeminiCliService,
  ensureGeminiCliWorkspace
} from '../ai/gemini-cli-service'
import { app } from 'electron'

/**
 * SPLIT-007 — main-process IPC singletons.
 *
 * Holds the long-lived service instances every register-*-ipc module
 * needs. Created lazily for the gemini CLI service (it allocates a
 * userData workspace on first call and we want to defer that until the
 * first ai:* request).
 */

export const zhengdaoAuth = new ZhengdaoAuth()
export const cloudSync = new CloudSync(zhengdaoAuth)
export const searchRepo = new SearchRepo()

/**
 * Tracks active streaming sessions so renderer-side cancellation can
 * short-circuit the upstream Gemini CLI process. Keyed by the renderer's
 * requestId.
 */
export const activeGeminiStreamSessions = new Map<string, { cancel: () => void }>()

let geminiCliService: ReturnType<typeof createGeminiCliService> | null = null

export function getGeminiCliService(): ReturnType<typeof createGeminiCliService> {
  if (!geminiCliService) {
    geminiCliService = createGeminiCliService({
      ensureWorkspace: async () => ensureGeminiCliWorkspace(app.getPath('userData'))
    })
  }
  return geminiCliService
}

export function hasProUser(user: ZhengdaoUser | null): boolean {
  return Boolean(user && (user.pro || user.tier === 'pro' || user.tier === 'team'))
}
