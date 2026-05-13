export type DeepLinkCallback = (url: string) => Promise<void>
export type DeepLinkErrorHandler = (error: unknown) => void

export interface DeepLinkCoordinator {
  handle: (rawUrl: string) => void
  markReady: () => void
}

export function isZhengdaoAuthCallbackUrl(rawUrl: string): boolean {
  return rawUrl.startsWith('zhengdao://auth/callback')
}

export function createDeepLinkCoordinator(
  handleAuthCallback: DeepLinkCallback,
  handleError: DeepLinkErrorHandler
): DeepLinkCoordinator {
  let ready = false
  const queuedUrls: string[] = []
  const queuedUrlSet = new Set<string>()
  const activeUrlSet = new Set<string>()
  const completedUrlSet = new Set<string>()

  function run(rawUrl: string): void {
    if (activeUrlSet.has(rawUrl) || completedUrlSet.has(rawUrl)) return
    activeUrlSet.add(rawUrl)
    handleAuthCallback(rawUrl)
      .then(() => {
        completedUrlSet.add(rawUrl)
      })
      .catch(handleError)
      .finally(() => {
        activeUrlSet.delete(rawUrl)
      })
  }

  return {
    handle(rawUrl: string): void {
      if (!isZhengdaoAuthCallbackUrl(rawUrl)) return
      if (ready) {
        run(rawUrl)
        return
      }
      if (queuedUrlSet.has(rawUrl)) return
      queuedUrlSet.add(rawUrl)
      queuedUrls.push(rawUrl)
    },
    markReady(): void {
      if (ready) return
      ready = true
      const pending = queuedUrls.splice(0)
      queuedUrlSet.clear()
      for (const rawUrl of pending) {
        run(rawUrl)
      }
    }
  }
}
