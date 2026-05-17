import { type ReactNode } from 'react'
import { X } from 'lucide-react'

interface DialogShellProps {
  title: string
  icon?: ReactNode
  children: ReactNode
  onClose: () => void
  widthClassName?: string
  maxHeightClassName?: string
  closeLabel?: string
}

export default function DialogShell({
  title,
  icon,
  children,
  onClose,
  widthClassName = 'max-w-xl',
  maxHeightClassName = 'max-h-[min(560px,calc(100vh-7rem))]',
  closeLabel = '关闭'
}: DialogShellProps) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/60 px-4 pb-8 pt-14 backdrop-blur-sm animate-fade-in"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className={`flex w-full ${widthClassName} ${maxHeightClassName} min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-2xl`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border-primary)] px-3 py-2.5">
          {icon}
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-[var(--text-muted)]">{title}</div>
          </div>
          <span className="hidden shrink-0 text-[10px] text-[var(--text-muted)] sm:inline">Esc 关闭</span>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="rounded-md p-1 text-[var(--text-muted)] transition hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
