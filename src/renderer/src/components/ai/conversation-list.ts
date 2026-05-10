export type ConversationListRow = {
  id: number
  title: string
  updated_at: string
  message_count?: number
}

export type ConversationListItem = {
  id: number
  label: string
  messageCount: number
  updatedAt: string
  selected: boolean
}

const DEFAULT_AI_CONVERSATION_TITLE = 'AI 对话'

export function resolveConversationLabel(
  conversation: Pick<ConversationListRow, 'title'>,
  fallbackIndex: number
): string {
  const title = conversation.title.trim()
  if (title && title !== DEFAULT_AI_CONVERSATION_TITLE) return title
  return `会话 ${fallbackIndex}`
}

export function buildConversationListItems(
  conversations: ConversationListRow[],
  currentConversationId: number | null
): ConversationListItem[] {
  return conversations.map((conversation, index) => ({
    id: conversation.id,
    label: resolveConversationLabel(conversation, conversations.length - index),
    messageCount: Number(conversation.message_count || 0),
    updatedAt: conversation.updated_at,
    selected: conversation.id === currentConversationId
  }))
}

export function pickConversationAfterDelete(
  conversations: Array<{ id: number; [key: string]: unknown }>,
  deletedConversationId: number,
  currentConversationId: number | null
): number | null {
  if (deletedConversationId !== currentConversationId) return currentConversationId
  return conversations.find((conversation) => conversation.id !== deletedConversationId)?.id ?? null
}
