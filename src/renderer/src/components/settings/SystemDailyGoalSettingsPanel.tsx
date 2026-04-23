import { useEffect, useState } from 'react'
import { Target } from 'lucide-react'
import { useSettingsStore } from '@/stores/settings-store'

export default function SystemDailyGoalSettingsPanel() {
  const systemDailyGoal = useSettingsStore((s) => s.systemDailyGoal)
  const setSystemDailyGoal = useSettingsStore((s) => s.setSystemDailyGoal)
  const [value, setValue] = useState(systemDailyGoal)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setValue(systemDailyGoal)
  }, [systemDailyGoal])

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <Target size={16} />
          系统默认日更目标
        </div>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          新作品默认跟随这里的目标；作品也可以切换为单独的自定义目标。
        </p>
      </div>

      <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-4">
        <label className="mb-2 block text-[11px] uppercase text-[var(--text-muted)]">默认目标字数</label>
        <input
          type="number"
          min={100}
          step={100}
          value={value}
          onChange={(event) => setValue(Number(event.target.value))}
          className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-2 text-lg font-mono text-[var(--accent-secondary)] focus:outline-none focus:border-[var(--accent-primary)]"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--text-muted)]">当前系统默认：{systemDailyGoal.toLocaleString()} 字</p>
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true)
              try {
                await setSystemDailyGoal(value)
              } finally {
                setSaving(false)
              }
            }}
            className="rounded bg-[var(--accent-primary)] px-3 py-1.5 text-xs text-[var(--accent-contrast)] disabled:opacity-40 hover:bg-[var(--accent-secondary)]"
          >
            {saving ? '保存中…' : '保存默认值'}
          </button>
        </div>
      </div>
    </div>
  )
}
