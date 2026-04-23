import { useEffect, useState } from 'react'
import { Database, FolderOpen, HardDrive, RefreshCw, RotateCcw } from 'lucide-react'

type BackupRow = { name: string; path: string; mtime: number; size: number }

export default function BackupMigrationSettingsPanel() {
  const [backupDir, setBackupDir] = useState('')
  const [backupHours, setBackupHours] = useState(24)
  const [backupMax, setBackupMax] = useState(10)
  const [backupList, setBackupList] = useState<BackupRow[]>([])
  const [backupBusy, setBackupBusy] = useState(false)
  const [backupNote, setBackupNote] = useState<string | null>(null)

  useEffect(() => {
    void Promise.all([
      window.api.getAppState('backup_directory'),
      window.api.getAppState('backup_interval_hours'),
      window.api.getAppState('backup_max_files')
    ]).then(([dir, hours, max]) => {
      setBackupDir(dir || '')
      setBackupHours(Number(hours || '24'))
      setBackupMax(Number(max || '10'))
    })
  }, [])

  useEffect(() => {
    void refreshBackupList()
  }, [])

  const refreshBackupList = async () => {
    const rows = await window.api.backupList()
    setBackupList(rows as BackupRow[])
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--text-muted)]">
        自动备份使用 SQLite 在线备份，写入时不会影响正在使用的库。更换整库后会自动刷新搜索索引；部分操作需重载界面后生效。
      </p>

      <div className="space-y-3 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
          <HardDrive size={16} className="text-[var(--accent-primary)]" />
          定时备份
        </div>
        <div className="flex items-start gap-2">
          <input
            readOnly
            value={backupDir}
            placeholder="默认使用应用数据目录下的 backups"
            className="flex-1 rounded border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-2 py-1.5 font-mono text-[11px] text-[var(--text-secondary)]"
          />
          <button
            type="button"
            onClick={async () => {
              const selected = await window.api.openDirectory()
              if (selected) setBackupDir(selected)
            }}
            className="flex shrink-0 items-center gap-1 rounded border border-[var(--border-secondary)] px-2 py-1.5 text-xs text-[var(--text-primary)] hover:border-[var(--accent-border)]"
          >
            <FolderOpen size={14} />
            选择目录
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[11px] uppercase text-[var(--text-muted)]">间隔</label>
            <select
              value={backupHours}
              onChange={(event) => setBackupHours(Number(event.target.value))}
              className="w-full rounded border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-2 py-1.5 text-sm text-[var(--text-primary)]"
            >
              <option value={1}>每 1 小时</option>
              <option value={6}>每 6 小时</option>
              <option value={12}>每 12 小时</option>
              <option value={24}>每 24 小时</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] uppercase text-[var(--text-muted)]">保留份数</label>
            <input
              type="number"
              min={1}
              max={100}
              value={backupMax}
              onChange={(event) => setBackupMax(Number(event.target.value))}
              className="w-full rounded border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-2 py-1.5 text-sm text-[var(--text-primary)]"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={backupBusy}
            onClick={async () => {
              setBackupBusy(true)
              setBackupNote(null)
              try {
                await window.api.backupConfigure(backupDir, backupHours, backupMax)
                setBackupNote('备份计划已更新')
                await refreshBackupList()
              } catch (error) {
                setBackupNote(error instanceof Error ? error.message : '保存失败')
              } finally {
                setBackupBusy(false)
              }
            }}
            className="rounded bg-[var(--accent-primary)] px-3 py-1.5 text-xs text-[var(--accent-contrast)] disabled:opacity-40 hover:bg-[var(--accent-secondary)]"
          >
            应用备份设置
          </button>
          <button
            type="button"
            disabled={backupBusy}
            onClick={async () => {
              setBackupBusy(true)
              setBackupNote(null)
              try {
                await window.api.backupNow()
                setBackupNote('已创建备份')
                await refreshBackupList()
              } catch (error) {
                setBackupNote(error instanceof Error ? error.message : '备份失败')
              } finally {
                setBackupBusy(false)
              }
            }}
            className="rounded border border-[var(--accent-border)] px-3 py-1.5 text-xs text-[var(--accent-secondary)] hover:bg-[var(--accent-surface)]"
          >
            立即备份
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase text-[var(--text-muted)]">备份记录</span>
        <button
          type="button"
          onClick={() => void refreshBackupList()}
          className="flex items-center gap-1 text-[11px] text-[var(--accent-secondary)] hover:text-[var(--accent-primary)]"
        >
          <RefreshCw size={12} />
          刷新
        </button>
      </div>
      <div className="max-h-36 overflow-y-auto rounded-lg border border-[var(--border-primary)] divide-y divide-[var(--border-primary)] text-xs">
        {backupList.length === 0 ? (
          <div className="p-3 text-[var(--text-muted)]">暂无备份文件</div>
        ) : (
          backupList.map((row) => (
            <div key={row.path} className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="truncate font-mono text-[var(--text-secondary)]">{row.name}</span>
              <button
                type="button"
                onClick={async () => {
                  if (!confirm('从该备份恢复将替换当前数据库，确定继续？')) return
                  setBackupBusy(true)
                  try {
                    const result = await window.api.backupRestoreFrom(row.path)
                    if (result && typeof result === 'object' && 'ok' in result && !result.ok && 'error' in result && result.error) {
                      setBackupNote(String(result.error))
                      return
                    }
                    await window.api.reloadWindow()
                  } finally {
                    setBackupBusy(false)
                  }
                }}
                className="flex shrink-0 items-center gap-0.5 text-[11px] text-amber-400 hover:text-amber-300"
              >
                <RotateCcw size={12} />
                恢复
              </button>
            </div>
          ))
        )}
      </div>

      <div className="space-y-3 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
          <Database size={16} className="text-[var(--accent-primary)]" />
          完整数据迁移
        </div>
        <p className="text-[11px] text-[var(--text-muted)]">
          导出当前 SQLite 数据库副本；导入将用所选文件整体替换本地库。
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={backupBusy}
            onClick={async () => {
              setBackupBusy(true)
              try {
                const result = await window.api.dataExportFull()
                if (result && typeof result === 'object' && 'canceled' in result && result.canceled) return
                setBackupNote('已导出数据库文件')
              } finally {
                setBackupBusy(false)
              }
            }}
            className="rounded border border-[var(--border-secondary)] bg-[var(--bg-tertiary)] px-3 py-1.5 text-xs text-[var(--text-primary)] hover:border-[var(--accent-border)]"
          >
            导出数据库
          </button>
          <button
            type="button"
            disabled={backupBusy}
            onClick={async () => {
              if (!confirm('导入将覆盖当前本地全部数据，是否继续？')) return
              setBackupBusy(true)
              try {
                const result = await window.api.dataImportFull()
                if (result && typeof result === 'object' && 'canceled' in result && result.canceled) return
                if (result && typeof result === 'object' && 'ok' in result && !result.ok && 'error' in result && result.error) {
                  setBackupNote(String(result.error))
                  return
                }
                await window.api.reloadWindow()
              } finally {
                setBackupBusy(false)
              }
            }}
            className="rounded border border-[var(--danger-border)] px-3 py-1.5 text-xs text-[var(--danger-primary)] hover:bg-[var(--danger-surface)]"
          >
            导入数据库
          </button>
          <button
            type="button"
            disabled={backupBusy}
            onClick={async () => {
              if (!confirm('从外部 .db 文件恢复？当前未保存的更改将丢失。')) return
              setBackupBusy(true)
              try {
                const result = await window.api.backupRestore()
                if (result && typeof result === 'object' && 'canceled' in result && result.canceled) return
                if (result && typeof result === 'object' && 'ok' in result && !result.ok && 'error' in result && result.error) {
                  setBackupNote(String(result.error))
                  return
                }
                await window.api.reloadWindow()
              } finally {
                setBackupBusy(false)
              }
            }}
            className="rounded border border-amber-500/40 px-3 py-1.5 text-xs text-amber-400 hover:bg-amber-500/10"
          >
            从文件恢复…
          </button>
        </div>
      </div>

      {backupNote && <p className="text-xs text-[var(--success-primary)]">{backupNote}</p>}
    </div>
  )
}
