import { createWriteStream } from 'node:fs'
import { mkdir, rename, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import type { ReadableStream } from 'node:stream/web'
import { pipeline } from 'node:stream/promises'
import { app, BrowserWindow, shell } from 'electron'
import electronUpdater from 'electron-updater'
import type { ManualInstallerDownloadResult, MacManualInstallerTarget, UpdateSnapshot } from '../../shared/update'
import { createMacManualInstallerTarget, normalizeMacInstallerArch, withManualUpdateFallback } from '../../shared/update'
import { canStartLifecycleUpdateCheck, UpdaterController } from './updater-controller'

const { autoUpdater } = electronUpdater

const INITIAL_CHECK_DELAY_MS = 10_000
const PERIODIC_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000
const LIFECYCLE_CHECK_THROTTLE_MS = 5 * 60 * 1000
const RELEASES_URL = 'https://github.com/royeedai-labs/zhengdao/releases'
const MANUAL_DOWNLOAD_URL = `${RELEASES_URL}/latest`
const MAC_AUTOMATIC_UPDATE_UNSUPPORTED_REASON =
  '当前 macOS 公测包未完成签名与公证，应用内自动安装会被系统拦截。请下载 DMG 后按 macOS 提示手动完成安装。'

function getAutomaticUpdateUnsupportedReason(): string | null {
  if (process.platform !== 'darwin') return null
  if (process.env.ZHENGDAO_ENABLE_MAC_AUTO_UPDATE === 'true') return null
  return MAC_AUTOMATIC_UPDATE_UNSUPPORTED_REASON
}

async function removeFileIfPresent(filePath: string): Promise<void> {
  try {
    await unlink(filePath)
  } catch {
    // Ignore missing temp files and cleanup failures; the next write will report real filesystem errors.
  }
}

async function downloadInstaller(target: MacManualInstallerTarget, destinationDir: string): Promise<string> {
  await mkdir(destinationDir, { recursive: true })

  const destinationPath = join(destinationDir, target.fileName)
  const partialPath = `${destinationPath}.download`

  await removeFileIfPresent(partialPath)

  const response = await fetch(target.downloadUrl)
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`当前 Release 未提供 ${target.fileName}，请打开下载页手动确认可用安装包。`)
    }
    throw new Error(`下载安装包失败（HTTP ${response.status}）`)
  }
  if (!response.body) {
    throw new Error('下载安装包失败：更新源没有返回文件内容')
  }

  try {
    await pipeline(
      Readable.fromWeb(response.body as ReadableStream<Uint8Array>),
      createWriteStream(partialPath)
    )
    await rename(partialPath, destinationPath)
  } catch (error) {
    await removeFileIfPresent(partialPath)
    throw error
  }

  return destinationPath
}

async function downloadAndOpenMacManualInstaller(version: string): Promise<ManualInstallerDownloadResult> {
  const arch = normalizeMacInstallerArch(process.arch)
  if (!arch) {
    throw new Error(`当前 macOS 架构 ${process.arch} 暂无可用安装包`)
  }

  const target = createMacManualInstallerTarget({
    version,
    arch,
    releasesUrl: RELEASES_URL
  })
  if (!target) {
    throw new Error('无法解析当前版本的 macOS 安装包地址')
  }

  const filePath = await downloadInstaller(target, app.getPath('downloads'))
  const openError = await shell.openPath(filePath)
  if (openError) {
    throw new Error(`安装包已下载到 ${filePath}，但无法自动打开：${openError}`)
  }

  return {
    fileName: target.fileName,
    filePath,
    downloadUrl: target.downloadUrl
  }
}

class AppUpdaterService {
  private readonly controller = new UpdaterController(autoUpdater, (snapshot) => this.broadcast(snapshot))
  private window: BrowserWindow | null = null
  private lifecycleTimer: NodeJS.Timeout | null = null
  private intervalTimer: NodeJS.Timeout | null = null
  private periodicChecksStarted = false
  private lastLifecycleCheckAt = 0

  constructor() {
    this.controller.bind()
  }

  attachWindow(window: BrowserWindow): void {
    this.window = window
    this.broadcast(this.controller.getSnapshot())

    if (!app.isPackaged) return

    this.ensurePeriodicChecks()
    this.scheduleLifecycleCheck(INITIAL_CHECK_DELAY_MS)
  }

  notifyAppActivated(): void {
    if (!app.isPackaged) return
    this.scheduleLifecycleCheck(0)
  }

  private ensurePeriodicChecks(): void {
    if (this.periodicChecksStarted) return
    this.periodicChecksStarted = true
    this.intervalTimer = setInterval(() => {
      void this.checkForUpdates()
    }, PERIODIC_CHECK_INTERVAL_MS)
  }

  private scheduleLifecycleCheck(delayMs: number): void {
    if (!canStartLifecycleUpdateCheck(this.controller.getSnapshot())) return
    if (this.lifecycleTimer) return

    const now = Date.now()
    if (now - this.lastLifecycleCheckAt < LIFECYCLE_CHECK_THROTTLE_MS) return

    this.lifecycleTimer = setTimeout(() => {
      this.lifecycleTimer = null
      if (!canStartLifecycleUpdateCheck(this.controller.getSnapshot())) return
      this.lastLifecycleCheckAt = Date.now()
      void this.checkForUpdates()
    }, delayMs)
  }

  getSnapshot(): UpdateSnapshot {
    return this.toPublicSnapshot(this.controller.getSnapshot())
  }

  async checkForUpdates(): Promise<UpdateSnapshot> {
    if (!app.isPackaged) {
      return this.getSnapshot()
    }

    try {
      await this.controller.checkForUpdates()
    } catch (error) {
      console.error('[Updater] checkForUpdates failed:', error)
      this.controller.markError(error, 'check')
    }

    return this.getSnapshot()
  }

  async downloadAvailableUpdate(): Promise<UpdateSnapshot> {
    if (!app.isPackaged) {
      throw new Error('当前不是打包版，无法下载更新')
    }
    const unsupportedReason = getAutomaticUpdateUnsupportedReason()
    if (unsupportedReason) {
      throw new Error(unsupportedReason)
    }

    try {
      await this.controller.downloadAvailableUpdate()
    } catch (error) {
      console.error('[Updater] downloadAvailableUpdate failed:', error)
      this.controller.markError(error, 'download')
    }

    return this.getSnapshot()
  }

  async installDownloadedUpdate(): Promise<void> {
    if (!app.isPackaged) {
      throw new Error('当前不是打包版，无法安装更新')
    }
    const unsupportedReason = getAutomaticUpdateUnsupportedReason()
    if (unsupportedReason) {
      throw new Error(unsupportedReason)
    }
    this.controller.installDownloadedUpdate()
  }

  async downloadManualInstallerUpdate(): Promise<ManualInstallerDownloadResult> {
    if (!app.isPackaged) {
      throw new Error('当前不是打包版，无法下载安装包')
    }
    const unsupportedReason = getAutomaticUpdateUnsupportedReason()
    if (!unsupportedReason) {
      throw new Error('当前平台支持应用内自动更新，无需手动下载安装包')
    }

    const version = this.controller.getSnapshot().version
    if (!version) {
      throw new Error('当前没有可下载的新版本')
    }

    return await downloadAndOpenMacManualInstaller(version)
  }

  private broadcast(snapshot: UpdateSnapshot): void {
    if (!this.window || this.window.isDestroyed()) return
    this.window.webContents.send('app:updateState', this.toPublicSnapshot(snapshot))
  }

  private toPublicSnapshot(snapshot: UpdateSnapshot): UpdateSnapshot {
    const unsupportedReason = getAutomaticUpdateUnsupportedReason()
    return withManualUpdateFallback(snapshot, unsupportedReason, unsupportedReason ? MANUAL_DOWNLOAD_URL : null)
  }
}

const appUpdaterService = new AppUpdaterService()

export function attachUpdaterWindow(window: BrowserWindow): void {
  appUpdaterService.attachWindow(window)
}

export function notifyUpdaterAppActivated(): void {
  appUpdaterService.notifyAppActivated()
}

export function getUpdateState(): UpdateSnapshot {
  return appUpdaterService.getSnapshot()
}

export function getAppVersion(): string {
  return app.getVersion()
}

export async function installDownloadedUpdate(): Promise<void> {
  await appUpdaterService.installDownloadedUpdate()
}

export async function checkForUpdates(): Promise<UpdateSnapshot> {
  return appUpdaterService.checkForUpdates()
}

export async function downloadAvailableUpdate(): Promise<UpdateSnapshot> {
  return appUpdaterService.downloadAvailableUpdate()
}

export async function downloadManualInstallerUpdate(): Promise<ManualInstallerDownloadResult> {
  return appUpdaterService.downloadManualInstallerUpdate()
}
