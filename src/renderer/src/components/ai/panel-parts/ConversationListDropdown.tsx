import { MessageSquarePlus, Pencil, Trash2, X } from 'lucide-react'
import type { ConversationListItem } from '../conversation-list'

/**
 * SPLIT-006 phase 2 — conversation history dropdown.
 *
 * Right-side absolute-positioned drawer rendered when the toolbar
 * "history" button is active. Stays a leaf component: receives a list
 * of derived items + callbacks; owns no state of its own.
 */

export interface ConversationListDropdownProps {
  open: boolean
  items: ConversationListItem[]
  onClose: () => void
  onCreate: () => void
  onSelect: (conversationId: number) => void
  onRename: (conversationId: number, currentTitle: string) => void
  onDelete: (conversationId: number) => void
}

export function ConversationListDropdown(props: ConversationListDropdownProps): JSX.Element | null {
  if (!props.open) return null

  return (
    <div
      className="absolute right-0 top-12 bottom-0 z-20 flex w-64 flex-col border-l border-[var(--border-primary)] bg-[var(--bg-primary)] shadow-2xl"
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-[var(--border-primary)] px-3">
        <div className="text-xs font-bold text-[var(--text-primary)]">会话历史</div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => props.onCreate()}
            title="新建 AI 会话"
            className="rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          >
            <MessageSquarePlus size={14} />
          </button>
          <button
            type="button"
            onClick={() => props.onClose()}
            title="关闭会话列表"
            className="rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {props.items.map((conversation) => (
          <div
            key={conversation.id}
            className={`group flex items-start gap-2 rounded-lg border p-2 ${
              conversation.selected
                ? 'border-[var(--accent-border)] bg-[var(--accent-surface)]'
                : 'border-transparent hover:border-[var(--border-primary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            <button
              type="button"
              onClick={() => props.onSelect(conversation.id)}
              className="min-w-0 flex-1 text-left"
            >
              <div className="truncate text-xs font-semibold text-[var(--text-primary)]">
                {conversation.label}
              </div>
              <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                {conversation.messageCount} 条消息
              </div>
              <div className="mt-0.5 truncate text-[10px] text-[var(--text-muted)]">
                {conversation.updatedAt}
              </div>
            </button>
            <button
              type="button"
              onClick={() => props.onRename(conversation.id, conversation.label)}
              title="重命名会话"
              className="rounded p-1 text-[var(--text-muted)] opacity-70 hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] group-hover:opacity-100"
            >
              <Pencil size={13} />
            </button>
            <button
              type="button"
              onClick={() => props.onDelete(conversation.id)}
              title="删除会话"
              className="rounded p-1 text-[var(--text-muted)] opacity-70 hover:bg-[var(--danger-surface)] hover:text-[var(--danger-primary)] group-hover:opacity-100"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
