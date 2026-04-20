import { useEffect, useRef, useState } from 'react'
import {
  PenTool,
  PanelLeftClose,
  PanelLeft,
  PanelRightClose,
  PanelRight,
  Users,
  BookOpen,
  Settings,
  ArrowUpRight,
  HelpCircle,
  ChevronDown,
  Cloud,
  Palette,
  LogIn,
  ArchiveRestore,
  BarChart3,
  LayoutDashboard,
  Flame
} from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'
import { useBookStore } from '@/stores/book-store'
import { useConfigStore } from '@/stores/config-store'
import { useForeshadowStore } from '@/stores/foreshadow-store'
import { useDailyStats } from '@/hooks/useDailyStats'
import { useWritingSession } from '@/hooks/useWritingSession'
import { useWritingStreak } from '@/hooks/useWritingStreak'
import PomodoroTimer from '@/components/shared/PomodoroTimer'
import UpdateActionButton from '@/components/shared/UpdateActionButton'
import { THEME_IDS, THEME_LABELS } from '@/utils/themes'
import { useAuthStore } from '@/stores/auth-store'

export default function TopBar() {
  const {
    leftPanelOpen,
    rightPanelOpen,
    toggleLeftPanel,
    toggleRightPanel,
    openModal,
    theme,
    setTheme
  } = useUIStore()
  const { books, currentBookId, closeBook } = useBookStore()
  const [themeMenuOpen, setThemeMenuOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const themeMenuRef = useRef<HTMLDivElement>(null)
  const accountMenuRef = useRef<HTMLDivElement>(null)

  const user = useAuthStore((s) => s.user)
  const syncing = useAuthStore((s) => s.syncing)
  const lastBookSyncAt = useAuthStore((s) => s.lastBookSyncAt)
  const loadUser = useAuthStore((s) => s.loadUser)
  const loadBookSyncMeta = useAuthStore((s) => s.loadBookSyncMeta)
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    void loadUser()
  }, [loadUser])

  useEffect(() => {
    void loadBookSyncMeta(currentBookId ?? null)
  }, [currentBookId, loadBookSyncMeta])

  useEffect(() => {
    if (!themeMenuOpen && !accountMenuOpen) return
    const close = (e: MouseEvent) => {
      const t = e.target as Node
      if (themeMenuOpen && !themeMenuRef.current?.contains(t)) setThemeMenuOpen(false)
      if (accountMenuOpen && !accountMenuRef.current?.contains(t)) setAccountMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [themeMenuOpen, accountMenuOpen])
  const config = useConfigStore((s) => s.config)
  const warningCount = useForeshadowStore((s) => s.getWarningCount())
  const currentBook = books.find((b) => b.id === currentBookId)
  const dailyGoal = config?.daily_goal || 6000
  const { todayWords: dailyWords } = useDailyStats()
  const dailyPercent = Math.min(100, Math.round((dailyWords / dailyGoal) * 100))
  const { sessionTime } = useWritingSession(currentBookId ?? null)
  const { streak } = useWritingStreak()

  const cloudIconClass = syncing
    ? 'text-emerald-400 animate-pulse'
    : user && lastBookSyncAt
      ? 'text-emerald-500'
      : 'text-slate-500'
  const cloudTitle = !user
    ? '未登录，云备份不可用'
    : syncing
      ? '正在同步到 Google Drive'
      : lastBookSyncAt
        ? `已备份到云端（${lastBookSyncAt.slice(0, 19).replace('T', ' ')}）`
        : '已登录，尚未备份当前书到云端'

  const applyTheme = (id: string) => {
    setTheme(id)
    setThemeMenuOpen(false)
    setAccountMenuOpen(false)
  }

  return (
    <div className="h-12 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] flex items-center justify-between shrink-0 shadow-sm z-30 drag-region gap-3">
      {/* 左区：logo + 书名 + 面板切换，pl-20 为 macOS 红绿灯留空 */}
      <div className="flex items-center space-x-4 pl-20 no-drag">
        <div className="flex items-center space-x-2 text-emerald-500 font-bold tracking-wide">
          <PenTool size={18} />
          <span>
            证道{' '}
            <span className="text-[10px] text-slate-500 font-normal ml-1 border border-slate-600 rounded px-1">
              Pro
            </span>
          </span>
        </div>
        <div className="h-4 w-px bg-slate-700" />
        <button
          onClick={closeBook}
          title="返回书架"
          className="text-sm font-medium text-[var(--text-primary)] hover:text-emerald-400 transition flex items-center gap-1"
        >
          《{currentBook?.title || '未命名'}》
          <ArrowUpRight size={12} className="text-[var(--text-muted)]" />
        </button>
        <button
          type="button"
          onClick={() => openModal('bookOverview')}
          title="书籍总览"
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border border-emerald-500/30 text-emerald-400/90 hover:bg-emerald-500/10 transition no-drag"
        >
          <LayoutDashboard size={14} />
          总览
        </button>
        <div className="flex items-center space-x-1 ml-4 text-[var(--text-muted)]">
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
        </div>
      </div>

      <div className="topbar-tools no-drag flex flex-1 min-w-0 items-center justify-center px-2 overflow-x-auto">
        <div className="flex min-w-max items-center gap-2 whitespace-nowrap py-1">
          <button
            onClick={() => openModal('fullCharacters')}
            title="角色总库"
            className="flex items-center px-3 py-1.5 bg-indigo-600/10 text-indigo-400 border border-indigo-500/30 rounded hover:bg-indigo-600/20 transition font-bold relative min-h-8"
          >
            <Users size={14} className="mr-1.5" /> 角色总库
          </button>
          <button
            onClick={() => openModal('settings')}
            title="设定维基"
            className="flex items-center px-3 py-1.5 bg-purple-600/10 text-purple-400 border border-purple-500/30 rounded hover:bg-purple-600/20 transition font-bold min-h-8"
          >
            <BookOpen size={14} className="mr-1.5" /> 设定维基
          </button>
          <button
            type="button"
            onClick={() => openModal('stats')}
            title="写作数据中心"
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-semibold border border-sky-500/35 text-sky-400 hover:bg-sky-500/10 transition shrink-0 min-h-8"
          >
            <BarChart3 size={14} />
            数据
          </button>
          <UpdateActionButton />
          <button
            onClick={() => openModal('help')}
            aria-label="使用帮助"
            className="p-1.5 hover:bg-[var(--bg-tertiary)] hover:text-[var(--accent-primary)] rounded transition shrink-0 min-h-8 min-w-8"
            title="使用帮助 (F1)"
          >
            <HelpCircle size={16} />
          </button>
          <button
            type="button"
            onClick={() => openModal('trash')}
            aria-label="回收站"
            title="回收站"
            className="p-1.5 hover:bg-[var(--bg-tertiary)] hover:text-orange-400 rounded transition text-[var(--text-muted)] shrink-0 min-h-8 min-w-8"
          >
            <ArchiveRestore size={16} />
          </button>
          <button
            onClick={() => openModal('projectSettings')}
            aria-label="项目设置"
            title="项目设置"
            className="p-1.5 hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] rounded transition shrink-0 min-h-8 min-w-8"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-4 text-[var(--text-secondary)] pr-4 no-drag shrink-0">
        <div className="flex items-center space-x-3 text-xs w-56">
          <span className="text-[var(--text-secondary)] font-medium shrink-0">日更:</span>
          <div className="flex-1 bg-[var(--bg-tertiary)] h-2.5 rounded-full overflow-hidden relative border border-[var(--border-primary)]">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.4)] transition-all duration-500"
              style={{ width: `${dailyPercent}%` }}
            />
          </div>
            <span className="text-[var(--accent-primary)] font-bold font-mono shrink-0">
            {dailyWords.toLocaleString()}{' '}
            <span className="text-[var(--text-muted)] text-[10px]">/ {(dailyGoal / 1000).toFixed(0)}k</span>
          </span>
        </div>
        <PomodoroTimer />
        <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap" title="本次写作会话">
          本次 {sessionTime}
        </span>
        <span className="flex items-center gap-0.5 text-[11px] text-orange-400/95 font-semibold whitespace-nowrap" title="连续打卡天数">
          <Flame size={13} className="text-orange-500 shrink-0" />
          {streak}
        </span>
        {warningCount > 0 && (
          <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">
            {warningCount} 待填坑
          </span>
        )}
        <span
          className="inline-flex items-center justify-center p-0.5"
          title={cloudTitle}
          aria-hidden
        >
          <Cloud size={18} className={cloudIconClass} strokeWidth={2} />
        </span>
        {!user && (
          <div className="relative no-drag" ref={themeMenuRef}>
            <button
              type="button"
              aria-label="选择主题"
              aria-expanded={themeMenuOpen}
              aria-haspopup="menu"
              onClick={() => {
                setAccountMenuOpen(false)
                setThemeMenuOpen((o) => !o)
              }}
              className="p-1.5 hover:bg-[var(--bg-tertiary)] hover:text-[var(--accent-primary)] rounded transition min-h-8 min-w-8"
              title="主题外观"
            >
              <Palette size={16} />
            </button>
            {themeMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-1 min-w-[168px] rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] py-1 shadow-xl"
              >
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  主题
                </div>
                {THEME_IDS.map((id) => (
                  <button
                    key={id}
                    role="menuitem"
                    type="button"
                    onClick={() => applyTheme(id)}
                    className={`flex w-full items-center px-3 py-2 text-left text-xs transition ${
                      theme === id
                        ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-medium'
                        : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                    }`}
                  >
                    {THEME_LABELS[id]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {!user && (
          <button
            type="button"
            onClick={() => openModal('login')}
            title="登录并启用云备份"
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 transition"
          >
            <LogIn size={14} />
            登录
          </button>
        )}
        {user && (
          <div className="relative no-drag flex items-center gap-1 max-w-[200px]" ref={accountMenuRef}>
            <button
              type="button"
              aria-label="账号与主题"
              aria-expanded={accountMenuOpen}
              aria-haspopup="menu"
              onClick={() => {
                setThemeMenuOpen(false)
                setAccountMenuOpen((o) => !o)
              }}
              className="flex items-center gap-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-secondary)] min-w-0"
            >
              {user.picture ? (
                <img
                  src={user.picture}
                  alt=""
                  className="w-7 h-7 rounded-full shrink-0 object-cover border border-[var(--border-primary)]"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold shadow-md shrink-0">
                  {(user.name || user.email || '?').charAt(0)}
                </div>
              )}
              <span className="text-xs font-medium text-[var(--text-primary)] truncate max-w-[96px] hidden sm:inline">
                {user.name || user.email || 'Google'}
              </span>
              <ChevronDown size={14} className="text-[var(--text-muted)] shrink-0" />
            </button>
            {accountMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] py-1 shadow-xl"
              >
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  主题
                </div>
                {THEME_IDS.map((id) => (
                  <button
                    key={id}
                    role="menuitem"
                    type="button"
                    onClick={() => applyTheme(id)}
                    className={`flex w-full items-center px-3 py-2 text-left text-xs transition ${
                      theme === id
                        ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-medium'
                        : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                    }`}
                  >
                    {THEME_LABELS[id]}
                  </button>
                ))}
                <div className="my-1 border-t border-[var(--border-primary)]" />
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    void logout()
                    setAccountMenuOpen(false)
                  }}
                  className="flex w-full items-center px-3 py-2 text-left text-xs text-red-400/90 hover:bg-[var(--bg-tertiary)] transition"
                >
                  退出 Google 登录
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
