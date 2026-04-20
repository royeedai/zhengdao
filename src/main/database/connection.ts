import Database from 'better-sqlite3'
import { app, dialog } from 'electron'
import { copyFileSync } from 'fs'
import { join } from 'path'
import { createSchema } from './schema'
import { runMigrations } from './migrations'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized')
  return db
}

export function getDatabasePath(): string {
  return join(app.getPath('userData'), 'zhengdao.db')
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

function openDatabaseAt(dbPath: string): void {
  const instance = new Database(dbPath)
  instance.pragma('journal_mode = WAL')
  instance.pragma('foreign_keys = ON')
  createSchema(instance)
  runMigrations(instance)
  db = instance
}

export function reopenDatabase(): void {
  closeDatabase()
  openDatabaseAt(getDatabasePath())
}

export function replaceDatabaseFromFile(sourcePath: string): void {
  closeDatabase()
  copyFileSync(sourcePath, getDatabasePath())
  openDatabaseAt(getDatabasePath())
}

export async function backupDatabaseFile(destinationPath: string): Promise<void> {
  const source = getDb()
  await source.backup(destinationPath)
}

export function initDatabase(): void {
  if (db) return

  try {
    openDatabaseAt(getDatabasePath())
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[DB] Failed to initialize database:', message)
    dialog.showErrorBox(
      '数据库初始化失败',
      `无法打开或创建数据库文件。\n路径: ${getDatabasePath()}\n错误: ${message}\n\n请检查磁盘空间和文件权限后重试。`
    )
    app.quit()
  }
}
