import { existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import * as appStateRepo from '../database/app-state-repo'
import { backupDatabaseFile } from '../database/connection'

const BACKUP_PREFIX = 'zhengdao-backup-'

export class AutoBackup {
  private timer: ReturnType<typeof setInterval> | null = null
  private lastDir = ''
  private lastMax = 10

  startFromStoredConfig(): void {
    const dir = appStateRepo.getAppState('backup_directory') || join(app.getPath('userData'), 'backups')
    const hours = Number(appStateRepo.getAppState('backup_interval_hours') || '24')
    const max = Number(appStateRepo.getAppState('backup_max_files') || '10')
    const intervalMs = Math.max(1, hours) * 60 * 60 * 1000
    this.start(dir, intervalMs, max)
  }

  start(backupDir: string, intervalMs: number, maxBackups: number): void {
    this.stop()
    this.lastDir = backupDir
    this.lastMax = maxBackups
    void this.performBackup(backupDir, maxBackups).catch((e) => console.error('[Backup]', e))
    this.timer = setInterval(() => {
      void this.performBackup(backupDir, maxBackups).catch((e) => console.error('[Backup]', e))
    }, intervalMs)
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  async performBackup(backupDir?: string, maxBackups?: number): Promise<void> {
    const dir = backupDir ?? this.lastDir
    const max = maxBackups ?? this.lastMax
    if (!dir) return
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = join(dir, `${BACKUP_PREFIX}${timestamp}.db`)
    await backupDatabaseFile(backupPath)

    const files = readdirSync(dir)
      .filter((f) => f.startsWith(BACKUP_PREFIX) && f.endsWith('.db'))
      .sort()
    while (files.length > max) {
      const oldest = files.shift()
      if (oldest) unlinkSync(join(dir, oldest))
    }
  }

  getDefaultBackupDir(): string {
    return join(app.getPath('userData'), 'backups')
  }
}

export const autoBackup = new AutoBackup()
