import type { UpdateMetadata, UpdateSnapshot } from '../../shared/update'
import { createIdleUpdateSnapshot, reduceUpdateSnapshot } from '../../shared/update'

type UpdaterEventName =
  | 'checking-for-update'
  | 'update-available'
  | 'download-progress'
  | 'update-downloaded'
  | 'update-not-available'
  | 'error'

interface UpdaterLike {
  autoDownload?: boolean
  autoInstallOnAppQuit?: boolean
  on: (event: UpdaterEventName, listener: (...args: any[]) => void) => unknown
  checkForUpdates: () => Promise<unknown> | unknown
  quitAndInstall: () => void
}

function toMetadata(payload: any): UpdateMetadata {
  return {
    version: payload?.version ?? null,
    releaseDate: payload?.releaseDate ?? null,
    releaseNotes: payload?.releaseNotes ?? null
  }
}

export class UpdaterController {
  private snapshot: UpdateSnapshot = createIdleUpdateSnapshot()
  private bound = false

  constructor(
    private readonly updater: UpdaterLike,
    private readonly broadcast: (snapshot: UpdateSnapshot) => void = () => void 0
  ) {}

  bind(): void {
    if (this.bound) return
    this.bound = true
    this.updater.autoDownload = true
    this.updater.autoInstallOnAppQuit = false

    this.updater.on('checking-for-update', () => {
      this.apply({ type: 'checking' })
    })

    this.updater.on('update-available', (info: unknown) => {
      this.apply({ type: 'update-available', payload: toMetadata(info) })
    })

    this.updater.on('download-progress', (progress: { percent?: number }) => {
      this.apply({
        type: 'download-progress',
        downloadPercent: progress?.percent ?? 0
      })
    })

    this.updater.on('update-downloaded', (info: unknown) => {
      this.apply({ type: 'update-downloaded', payload: toMetadata(info) })
    })

    this.updater.on('update-not-available', () => {
      this.apply({ type: 'update-not-available' })
    })

    this.updater.on('error', (error: Error) => {
      this.apply({
        type: 'error',
        errorMessage: error?.message || '检查更新失败'
      })
    })
  }

  getSnapshot(): UpdateSnapshot {
    return this.snapshot
  }

  async checkForUpdates(): Promise<void> {
    this.bind()
    await this.updater.checkForUpdates()
  }

  markError(error: unknown): void {
    const message = error instanceof Error ? error.message : '检查更新失败'
    this.apply({ type: 'error', errorMessage: message })
  }

  installDownloadedUpdate(): void {
    if (this.snapshot.status !== 'ready') {
      throw new Error('Update not ready to install')
    }
    this.updater.quitAndInstall()
  }

  private apply(event: Parameters<typeof reduceUpdateSnapshot>[1]): void {
    this.snapshot = reduceUpdateSnapshot(this.snapshot, event)
    this.broadcast(this.snapshot)
  }
}
