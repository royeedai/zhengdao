import { useEffect, useMemo, useState } from 'react'
import { Keyboard } from 'lucide-react'
import { useShortcutStore } from '@/stores/shortcut-store'
import { SHORTCUT_ACTIONS, chordFromKeyEvent } from '@/utils/shortcuts'
import type { ShortcutAction } from '@/utils/shortcuts'

export default function ShortcutSettingsPanel() {
  const getChord = useShortcutStore((s) => s.getChord)
  const setShortcut = useShortcutStore((s) => s.setChord)
  const [captureId, setCaptureId] = useState<string | null>(null)

  const actionsByCategory = useMemo(() => {
    const groups: Record<string, ShortcutAction[]> = {}
    for (const action of SHORTCUT_ACTIONS) {
      if (!groups[action.category]) groups[action.category] = []
      groups[action.category].push(action)
    }
    return groups
  }, [])

  useEffect(() => {
    if (!captureId) return
    const onKey = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (event.key === 'Escape') {
        setCaptureId(null)
        return
      }
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) return
      const chord = chordFromKeyEvent(event)
      if (chord.length > 0) {
        void setShortcut(captureId, chord)
        setCaptureId(null)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [captureId, setShortcut])

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-4 text-sm text-[var(--text-secondary)]">
        <div className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
          <Keyboard size={16} />
          快捷键
        </div>
        <p className="mt-2 text-xs">
          点击快捷键列后按下新组合即可录制；`Esc` 取消录制。「恢复默认」清除自定义绑定。
        </p>
      </div>

      {Object.entries(actionsByCategory).map(([category, actions]) => (
        <div key={category}>
          <h3 className="mb-2 text-[11px] font-bold uppercase text-[var(--text-muted)]">{category}</h3>
          <div className="overflow-hidden rounded-lg border border-[var(--border-primary)] divide-y divide-[var(--border-primary)]">
            {actions.map((action) => (
              <div
                key={action.id}
                className="flex items-center justify-between gap-2 bg-[var(--bg-primary)] px-3 py-2.5 text-xs"
              >
                <span className="font-medium text-[var(--text-primary)]">{action.label}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setCaptureId(action.id)}
                    className={`min-w-[120px] rounded border px-2 py-1 text-center font-mono text-[11px] transition ${
                      captureId === action.id
                        ? 'border-[var(--accent-primary)] text-[var(--accent-secondary)] animate-pulse'
                        : 'border-[var(--border-secondary)] text-[var(--text-secondary)] hover:border-[var(--accent-border)]'
                    }`}
                  >
                    {captureId === action.id ? '请按键…' : getChord(action.id)}
                  </button>
                  <button
                    type="button"
                    onClick={() => void setShortcut(action.id, '')}
                    className="px-2 text-[11px] text-[var(--text-muted)] hover:text-[var(--accent-secondary)]"
                  >
                    恢复默认
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
