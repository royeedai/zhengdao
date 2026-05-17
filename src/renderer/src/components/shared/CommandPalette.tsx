import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Command as CommandIcon } from 'lucide-react'
import {
  createWorkspaceCommands,
  fuzzyCommandMatch,
  type CommandCategory,
  type WorkspaceCommand
} from '@/commands/workspace-command-registry'
import { useBookStore } from '@/stores/book-store'
import { useUIStore } from '@/stores/ui-store'
import DialogShell from './DialogShell'
import { useListKeyboard } from '@/hooks/useListKeyboard'

const CATEGORY_ORDER: CommandCategory[] = ['导航', '编辑', 'AI', '视图', '主题', '应用']

export default function CommandPalette() {
  const closeModal = useUIStore((s) => s.closeModal)
  const openModal = useUIStore((s) => s.openModal)
  const toggleLeftPanel = useUIStore((s) => s.toggleLeftPanel)
  const toggleRightPanel = useUIStore((s) => s.toggleRightPanel)
  const toggleBottomPanel = useUIStore((s) => s.toggleBottomPanel)
  const setBlackRoomMode = useUIStore((s) => s.setBlackRoomMode)
  const setTheme = useUIStore((s) => s.setTheme)
  const openAiAssistant = useUIStore((s) => s.openAiAssistant)
  const currentBookId = useBookStore((s) => s.currentBookId)
  const closeBook = useBookStore((s) => s.closeBook)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [recentCommandIds, setRecentCommandIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('write-command-recent')
      const parsed = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string').slice(0, 5) : []
    } catch {
      return []
    }
  })

  const allCommands = useMemo(
    () =>
      createWorkspaceCommands({
        openModal,
        openAiAssistant: () => openAiAssistant(),
        closeBook,
        toggleLeftPanel,
        toggleRightPanel,
        toggleBottomPanel,
        setBlackRoomMode,
        setTheme
      }),
    [
      closeBook,
      openAiAssistant,
      openModal,
      setBlackRoomMode,
      setTheme,
      toggleBottomPanel,
      toggleLeftPanel,
      toggleRightPanel
    ]
  )

  const availableCommands = useMemo(
    () => allCommands.filter((command) => (command.requiresBook ? currentBookId != null : true)),
    [allCommands, currentBookId]
  )

  const filtered = useMemo(() => {
    const matches = availableCommands.filter((command) => fuzzyCommandMatch(query, command))
    if (query.trim()) return matches
    const recent = recentCommandIds
      .map((id) => matches.find((command) => command.id === id))
      .filter((command): command is WorkspaceCommand => Boolean(command))
    const recentIds = new Set(recent.map((command) => command.id))
    return [...recent, ...matches.filter((command) => !recentIds.has(command.id))]
  }, [availableCommands, query, recentCommandIds])

  const indexById = useMemo(() => {
    const m = new Map<string, number>()
    filtered.forEach((command, index) => m.set(command.id, index))
    return m
  }, [filtered])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const execute = useCallback(
    (command: WorkspaceCommand) => {
      command.action()
      setRecentCommandIds((current) => {
        const next = [command.id, ...current.filter((id) => id !== command.id)].slice(0, 5)
        try {
          localStorage.setItem('write-command-recent', JSON.stringify(next))
        } catch {
          void 0
        }
        return next
      })
      if (useUIStore.getState().activeModal === 'commandPalette') {
        closeModal()
      }
    },
    [closeModal]
  )

  const { selectedIndex, setCursor, onKeyDown } = useListKeyboard({
    items: filtered,
    onPick: (command) => execute(command),
    onEscape: closeModal
  })

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-palette-index="${selectedIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  return (
    <DialogShell title="找动作" icon={<CommandIcon size={18} className="shrink-0 text-[var(--accent-primary)]" />} onClose={closeModal}>
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border-primary)] px-3 py-2.5">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="找动作、打开工具或切换视图…"
          className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-0"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto py-2">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
            无匹配命令。试试输入“新建”“搜索”“主题”。
          </div>
        ) : (
          CATEGORY_ORDER.map((category) => {
            const items = filtered.filter((command) => command.category === category)
            if (items.length === 0) return null
            const hasRecent = !query.trim() && items.some((command) => recentCommandIds.includes(command.id))
            return (
              <div key={category} className="mb-2 last:mb-0">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {hasRecent ? `${category} · 最近使用` : category}
                </div>
                {items.map((command) => {
                  const index = indexById.get(command.id) ?? 0
                  const selected = index === selectedIndex
                  const Icon = command.icon
                  return (
                    <button
                      key={command.id}
                      type="button"
                      data-palette-index={index}
                      onMouseEnter={() => setCursor(index)}
                      onClick={() => execute(command)}
                      className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                        selected
                          ? 'bg-[var(--accent-surface)] text-[var(--text-primary)] ring-1 ring-inset ring-[var(--accent-border)]'
                          : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                      }`}
                    >
                      <Icon size={16} className="shrink-0 text-[var(--text-secondary)]" />
                      <span className="min-w-0 flex-1 truncate">{command.label}</span>
                      {command.shortcut ? (
                        <span className="shrink-0 text-[10px] tabular-nums text-[var(--text-muted)]">
                          {command.shortcut}
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            )
          })
        )}
      </div>
    </DialogShell>
  )
}
