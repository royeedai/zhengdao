import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import {
  PanelBottomClose,
  PanelBottomOpen,
  PanelLeftClose,
  PanelLeft,
  PanelRightClose,
  PanelRight,
  Users,
  BookOpen,
  Settings,
  ArrowUpRight,
  AlertCircle,
  BarChart3,
  Check,
  Command,
  Boxes,
  Lightbulb,
  LayoutDashboard,
  LayoutPanelTop,
  MoreHorizontal,
  Search
} from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'
import { useBookStore } from '@/stores/book-store'
import PomodoroTimer from '@/components/shared/PomodoroTimer'
import AppBrand from '@/components/shared/AppBrand'
import AccountSettingsMenu from '@/components/shared/AccountSettingsMenu'
import { getCurrentTitlebarSafeArea } from '@/utils/window-shell'
import { BUILTIN_WORKSPACE_LAYOUT_PRESETS, type WorkspaceLayoutPresetId } from '@/utils/workspace-layout'
import {
  getPrimaryWorkspaceToolActions,
  getWorkspaceToolActionGroups,
  type WorkspaceToolAction,
  type WorkspaceToolActionId
} from './workspace-actions'

function WorkspaceActionIcon({ id, size = 14 }: { id: WorkspaceToolActionId; size?: number }) {
  switch (id) {
    case 'bookOverview':
      return <LayoutDashboard size={size} />
    case 'fullCharacters':
      return <Users size={size} />
    case 'settings':
      return <BookOpen size={size} />
    case 'stats':
      return <BarChart3 size={size} />
    case 'foreshadowBoard':
      return <AlertCircle size={size} />
    case 'quickNotes':
      return <Lightbulb size={size} />
    case 'projectSettings':
      return <Settings size={size} />
    case 'toolboxHub':
      return <Boxes size={size} />
  }
}

function TopbarToolButton({
  action,
  children,
  onClick
}: {
  action: WorkspaceToolAction
  children: ReactNode
  onClick: () => void
}) {
  const toneClass =
    action.primaryTone === 'accent'
      ? 'border-[var(--accent-border)] bg-[var(--accent-surface)] text-[var(--accent-secondary)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-tertiary)]'
      : 'border-[var(--border-secondary)] bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:border-[var(--accent-border)] hover:bg-[var(--accent-surface)] hover:text-[var(--accent-secondary)]'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={action.title}
      title={action.title}
      className={`flex min-h-8 shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-[11px] font-semibold transition ${toneClass}`}
    >
      {children}
    </button>
  )
}

export default function TopBar() {
  const leftPanelOpen = useUIStore((s) => s.leftPanelOpen)
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen)
  const bottomPanelOpen = useUIStore((s) => s.bottomPanelOpen)
  const toggleLeftPanel = useUIStore((s) => s.toggleLeftPanel)
  const toggleRightPanel = useUIStore((s) => s.toggleRightPanel)
  const toggleBottomPanel = useUIStore((s) => s.toggleBottomPanel)
  const openModal = useUIStore((s) => s.openModal)
  const topbarToolsCollapsed = useUIStore((s) => s.topbarToolsCollapsed)
  const toggleTopbarToolsCollapsed = useUIStore((s) => s.toggleTopbarToolsCollapsed)
  const workspaceLayoutPresetId = useUIStore((s) => s.workspaceLayoutPresetId)
  const customWorkspaceLayoutPresets = useUIStore((s) => s.customWorkspaceLayoutPresets)
  const applyWorkspaceLayoutPreset = useUIStore((s) => s.applyWorkspaceLayoutPreset)
  const saveCurrentWorkspaceLayoutPreset = useUIStore((s) => s.saveCurrentWorkspaceLayoutPreset)
  const books = useBookStore((s) => s.books)
  const currentBookId = useBookStore((s) => s.currentBookId)
  const closeBook = useBookStore((s) => s.closeBook)
  const [toolMenuOpen, setToolMenuOpen] = useState(false)
  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false)
  const [savingLayoutPreset, setSavingLayoutPreset] = useState(false)
  const [layoutPresetName, setLayoutPresetName] = useState('')
  const toolMenuRef = useRef<HTMLDivElement>(null)
  const layoutMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!toolMenuOpen) return
    const close = (e: MouseEvent) => {
      const t = e.target as Node
      if (toolMenuOpen && !toolMenuRef.current?.contains(t)) setToolMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [toolMenuOpen])

  useEffect(() => {
    if (!layoutMenuOpen) return
    const close = (e: MouseEvent) => {
      const t = e.target as Node
      if (!layoutMenuRef.current?.contains(t)) {
        setLayoutMenuOpen(false)
        setSavingLayoutPreset(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [layoutMenuOpen])
  const currentBook = books.find((b) => b.id === currentBookId)
  const titlebarSafeArea = getCurrentTitlebarSafeArea()
  const primaryToolActions = getPrimaryWorkspaceToolActions()
  const toolActionGroups = getWorkspaceToolActionGroups()
  const activeLayoutPreset = [...BUILTIN_WORKSPACE_LAYOUT_PRESETS, ...customWorkspaceLayoutPresets].find(
    (preset) => preset.id === workspaceLayoutPresetId
  )

  const closeToolsAndOpenModal = (modal: Parameters<typeof openModal>[0]) => {
    setToolMenuOpen(false)
    openModal(modal)
  }

  const openWorkspaceAction = (action: WorkspaceToolAction) => {
    closeToolsAndOpenModal(action.modal)
  }

  const handleApplyLayoutPreset = (presetId: WorkspaceLayoutPresetId) => {
    applyWorkspaceLayoutPreset(presetId)
    setLayoutMenuOpen(false)
    setSavingLayoutPreset(false)
  }

  const handleSaveLayoutPreset = () => {
    const preset = saveCurrentWorkspaceLayoutPreset(
      layoutPresetName || `布局 ${customWorkspaceLayoutPresets.length + 1}`
    )
    if (!preset) return
    setLayoutPresetName('')
    setSavingLayoutPreset(false)
  }

  const handleTitlebarDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target
    if (!(target instanceof HTMLElement)) return
    if (
      target.closest('button, input, select, textarea, a, [role="menu"], [role="menuitem"], [data-no-titlebar-toggle]')
    ) {
      return
    }
    void window.api.toggleMaximize()
  }

  return (
    <div
      className="h-12 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] flex items-center justify-between shrink-0 shadow-sm z-30 drag-region gap-3"
      onDoubleClick={handleTitlebarDoubleClick}
      style={{
        paddingLeft: `${titlebarSafeArea.leftInset}px`,
        paddingRight: `${titlebarSafeArea.rightInset}px`
      }}
    >
      <div className="flex items-center space-x-3 no-drag min-w-0">
        <AppBrand compact />
        <div className="h-4 w-px bg-[var(--border-secondary)]" />
        <button
          onClick={closeBook}
          title="返回书架"
          className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--accent-secondary)] transition flex items-center gap-1 min-w-0"
        >
          <span className="truncate">《{currentBook?.title || '未命名'}》</span>
          <ArrowUpRight size={12} className="text-[var(--text-muted)]" />
        </button>
        <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
          <button
            type="button"
            onClick={() => openModal('commandPalette')}
            title="找动作（⌘K / Ctrl+K）"
            aria-label="打开命令面板"
            className="flex min-h-8 shrink-0 items-center gap-1.5 rounded-md border border-[var(--border-secondary)] bg-[var(--surface-secondary)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--accent-border)] hover:bg-[var(--accent-surface)] hover:text-[var(--accent-secondary)]"
          >
            <Command size={16} />
            <span className="hidden lg:inline">找动作</span>
          </button>
          <button
            type="button"
            onClick={() => openModal('globalSearch')}
            title="搜内容（⌘P / Ctrl+P）"
            aria-label="打开全局搜索"
            className="flex min-h-8 shrink-0 items-center gap-1.5 rounded-md border border-[var(--border-secondary)] bg-[var(--surface-secondary)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--accent-border)] hover:bg-[var(--accent-surface)] hover:text-[var(--accent-secondary)]"
          >
            <Search size={16} />
            <span className="hidden lg:inline">搜内容</span>
          </button>
        </div>
        <div className="flex items-center space-x-1 ml-2 text-[var(--text-muted)]">
          <button
            onClick={toggleLeftPanel}
            aria-label={leftPanelOpen ? '收起目录' : '展开目录'}
            aria-expanded={leftPanelOpen}
            title={leftPanelOpen ? '收起目录' : '展开目录'}
            className="p-1.5 hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] rounded transition min-h-8 min-w-8"
          >
            {leftPanelOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
          </button>
          <button
            onClick={toggleRightPanel}
            aria-label={rightPanelOpen ? '收起辅助面板' : '展开辅助面板'}
            aria-expanded={rightPanelOpen}
            title={rightPanelOpen ? '收起辅助面板' : '展开辅助面板'}
            className="p-1.5 hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] rounded transition min-h-8 min-w-8"
          >
            {rightPanelOpen ? <PanelRightClose size={16} /> : <PanelRight size={16} />}
          </button>
          <button
            onClick={toggleBottomPanel}
            aria-label={bottomPanelOpen ? '收起底栏' : '展开底栏'}
            aria-expanded={bottomPanelOpen}
            title={bottomPanelOpen ? '收起底栏' : '展开底栏'}
            className="p-1.5 hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] rounded transition min-h-8 min-w-8"
          >
            {bottomPanelOpen ? <PanelBottomClose size={16} /> : <PanelBottomOpen size={16} />}
          </button>
          <div className="relative" ref={layoutMenuRef}>
            <button
              type="button"
              onClick={() => setLayoutMenuOpen((open) => !open)}
              aria-label="布局预设"
              aria-haspopup="menu"
              aria-expanded={layoutMenuOpen}
              title={`布局：${activeLayoutPreset?.label ?? '自定义'}`}
              className="flex min-h-8 max-w-[142px] items-center gap-1.5 rounded-md border border-[var(--border-secondary)] bg-[var(--surface-secondary)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--accent-border)] hover:bg-[var(--accent-surface)] hover:text-[var(--accent-secondary)]"
            >
              <LayoutPanelTop size={16} />
              <span className="hidden max-w-[86px] truncate xl:inline">
                {activeLayoutPreset?.label ?? '布局'}
              </span>
            </button>
            {layoutMenuOpen && (
              <div
                role="menu"
                className="absolute left-0 top-full z-50 mt-1 w-[236px] rounded-lg border border-[var(--border-primary)] bg-[var(--surface-elevated)] py-1 shadow-xl"
              >
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  IDE 布局
                </div>
                {[...BUILTIN_WORKSPACE_LAYOUT_PRESETS, ...customWorkspaceLayoutPresets].map((preset) => {
                  const active = workspaceLayoutPresetId === preset.id
                  return (
                    <button
                      key={preset.id}
                      role="menuitem"
                      type="button"
                      onClick={() => handleApplyLayoutPreset(preset.id)}
                      className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                    >
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-[var(--accent-secondary)]">
                        {active && <Check size={13} />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{preset.label}</span>
                        <span className="block truncate text-[10px] text-[var(--text-muted)]">
                          {preset.description}
                        </span>
                      </span>
                    </button>
                  )
                })}
                <div className="my-1 border-t border-[var(--border-primary)]" />
                {savingLayoutPreset ? (
                  <div className="px-3 py-2">
                    <input
                      value={layoutPresetName}
                      onChange={(event) => setLayoutPresetName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') handleSaveLayoutPreset()
                        if (event.key === 'Escape') setSavingLayoutPreset(false)
                      }}
                      autoFocus
                      placeholder="布局名称"
                      className="h-8 w-full rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] px-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                    />
                    <button
                      type="button"
                      onClick={handleSaveLayoutPreset}
                      className="mt-2 h-8 w-full rounded-md bg-[var(--accent-primary)] text-xs font-semibold text-[var(--accent-contrast)] transition hover:bg-[var(--accent-secondary)]"
                    >
                      保存布局
                    </button>
                  </div>
                ) : (
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => setSavingLayoutPreset(true)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                  >
                    <LayoutPanelTop size={14} /> 保存当前布局
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className={`topbar-tools no-drag flex-1 min-w-0 items-center justify-center px-2 overflow-x-auto ${
          topbarToolsCollapsed ? 'hidden' : 'hidden xl:flex'
        }`}
      >
        <div className="flex min-w-max items-center gap-2 whitespace-nowrap py-1">
          {primaryToolActions.map((action) => (
            <TopbarToolButton
              key={action.id}
              action={action}
              onClick={() => openWorkspaceAction(action)}
            >
              <WorkspaceActionIcon id={action.id} />
              {action.label}
            </TopbarToolButton>
          ))}
        </div>
      </div>

      <div
        className={`relative no-drag shrink-0 ${topbarToolsCollapsed ? 'flex' : 'flex xl:hidden'}`}
        ref={toolMenuRef}
      >
        <button
          type="button"
          aria-label="更多工作区工具"
          aria-haspopup="menu"
          aria-expanded={toolMenuOpen}
          title="更多工作区工具"
          onClick={() => setToolMenuOpen((open) => !open)}
          className="p-1.5 hover:bg-[var(--bg-tertiary)] hover:text-[var(--accent-primary)] rounded transition min-h-8 min-w-8"
        >
          <MoreHorizontal size={16} />
        </button>
        {toolMenuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-1 min-w-[196px] rounded-lg border border-[var(--border-primary)] bg-[var(--surface-elevated)] py-1 shadow-xl"
          >
            {toolActionGroups.map((group, index) => (
              <div key={group.id}>
                {index > 0 && <div className="my-1 border-t border-[var(--border-primary)]" />}
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  {group.label}
                </div>
                {group.actions.map((action) => (
                  <button
                    key={action.id}
                    role="menuitem"
                    type="button"
                    onClick={() => openWorkspaceAction(action)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                  >
                    <WorkspaceActionIcon id={action.id} /> {action.menuLabel}
                  </button>
                ))}
              </div>
            ))}
            <div className="my-1 border-t border-[var(--border-primary)]" />
            <button
              role="menuitem"
              type="button"
              onClick={() => toggleTopbarToolsCollapsed()}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            >
              <MoreHorizontal size={14} />
              {topbarToolsCollapsed ? '固定显示工具区' : '收起工具区'}
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 xl:gap-3 text-[var(--text-secondary)] no-drag shrink-0">
        <PomodoroTimer />
        <AccountSettingsMenu showTrash />
      </div>
    </div>
  )
}
