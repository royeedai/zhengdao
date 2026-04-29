import { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, Check, Loader2, Plus, Send, Sparkles, X } from 'lucide-react'
import { useBookStore } from '@/stores/book-store'
import { useChapterStore } from '@/stores/chapter-store'
import { useToastStore } from '@/stores/toast-store'
import { useUIStore } from '@/stores/ui-store'
import { aiPromptStream, getResolvedGlobalAiConfig, isAiConfigReady, type AiCallerConfig } from '@/utils/ai'
import { resolveAssistantContext } from '@/utils/ai/assistant-context'
import { shouldSubmitAiAssistantInput } from '../input-behavior'
import {
  appendAssistantStreamToken as _appendAssistantStreamToken,
  completeAssistantStreamMessage,
  createAssistantStreamChunkQueue,
  createPendingAssistantStreamMessage,
  replaceAssistantStreamContent
} from '../streaming-message'
import {
  CREATION_BRIEF_FIELDS,
  getCreationBriefMissingFields,
  isCreationBriefComplete,
  normalizeCreationBrief,
  stripBookCreationChapterContent,
  validateBookCreationPackage,
  type AiBookCreationPackage,
  type AssistantCreationBrief,
  type CreationBriefField
} from '../../../../../shared/ai-book-creation'
import { mergeCreationBrief } from './brief'
import { buildBookPackagePrompt, buildBookshelfBriefSystemPrompt, buildBookshelfBriefUserPrompt } from './prompts'
import {
  buildFallbackBookCreationPackage,
  coerceBookCreationPackage,
  createBookFromPackageThroughExistingApi,
  mergeBookCreationPackageWithFallback,
  type AiBookCreationResult
} from './package'
import {
  buildBookPackageStreamContent,
  buildBookshelfBriefFinalContent,
  buildBookshelfBriefStreamContent,
  extractJsonObject
} from './streaming'

// Suppress the import-only-for-side-effects warning when the helper is
// not used directly here but is still exported from streaming-message.
void _appendAssistantStreamToken

/**
 * SPLIT-006 — bookshelf "create new book" assistant panel.
 *
 * Two-step flow:
 *   1. Brief negotiation — collect title / genreTheme / targetLength
 *      via natural-language chat + quick-pick option chips.
 *   2. Package preview + create — once the brief is confirmed, generate
 *      a structured AiBookCreationPackage, validate it, then either call
 *      `window.api.createBookFromAiPackage` (preferred) or fall back to
 *      a sequence of creates through the legacy IPC.
 *
 * No global state mutation outside of zustand stores; the panel is
 * self-contained and can be opened/closed without lifecycle hooks
 * elsewhere in the app.
 */

type AiMessage = {
  id: number
  role: 'user' | 'assistant' | 'system'
  content: string
  streaming?: boolean
  streamingLabel?: string
  metadata?: Record<string, unknown>
}

export function BookshelfCreationAssistantPanel(): JSX.Element {
  const closeAiAssistant = useUIStore((s) => s.closeAiAssistant)
  const openAiAssistant = useUIStore((s) => s.openAiAssistant)
  const aiAssistantCommand = useUIStore((s) => s.aiAssistantCommand)
  const consumeAiAssistantCommand = useUIStore((s) => s.consumeAiAssistantCommand)
  const loadBooks = useBookStore((s) => s.loadBooks)
  const openBook = useBookStore((s) => s.openBook)
  const selectChapter = useChapterStore((s) => s.selectChapter)
  const [brief, setBrief] = useState<AssistantCreationBrief>({})
  const [messages, setMessages] = useState<AiMessage[]>([])
  const [input, setInput] = useState('')
  const [customOptionInputs, setCustomOptionInputs] = useState<Record<string, string>>({})
  const [packageDraft, setPackageDraft] = useState<AiBookCreationPackage | null>(null)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const nextLocalMessageIdRef = useRef(-1)
  const sendCommandRef = useRef<(text: string) => void>(() => {})
  const missingFields = useMemo(() => getCreationBriefMissingFields(brief), [brief])
  const packageValidation = useMemo(() => validateBookCreationPackage(packageDraft), [packageDraft])
  const canConfirmBrief = isCreationBriefComplete(brief)
  const canGeneratePackage = canConfirmBrief && !loading
  const canCreate = packageValidation.ok && !creating
  const composerOptionFields = useMemo(() => {
    const normalized = normalizeCreationBrief(brief)
    const missingRequired = CREATION_BRIEF_FIELDS.filter(
      (field) => field.required && !String(normalized[field.key] || '').trim()
    )
    const otherFields = CREATION_BRIEF_FIELDS.filter(
      (field) => !missingRequired.some((missing) => missing.key === field.key)
    )
    return [...missingRequired, ...otherFields]
  }, [brief])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length, loading])

  useEffect(() => {
    if (!aiAssistantCommand || aiAssistantCommand.surface !== 'bookshelf') return
    consumeAiAssistantCommand(aiAssistantCommand.id)
    if (!aiAssistantCommand.input.trim()) return
    setInput(aiAssistantCommand.input)
    if (aiAssistantCommand.autoSend) {
      window.setTimeout(() => sendCommandRef.current(aiAssistantCommand.input), 0)
    }
  }, [aiAssistantCommand, consumeAiAssistantCommand])

  const addLocalMessage = (
    role: AiMessage['role'],
    content: string,
    metadata?: Record<string, unknown>
  ): AiMessage => {
    const message: AiMessage = {
      id: nextLocalMessageIdRef.current,
      role,
      content,
      metadata
    }
    nextLocalMessageIdRef.current -= 1
    setMessages((current) => [...current, message])
    return message
  }

  const updateBriefField = (key: keyof AssistantCreationBrief, value: string) => {
    setBrief((current) => ({ ...current, [key]: value, confirmed: false }))
    setPackageDraft(null)
  }

  const applyBriefOption = (field: CreationBriefField, option: string, toggleSelected: boolean) => {
    setBrief((current) => {
      const currentValue = String(current[field.key] || '').trim()
      const values = currentValue
        .split(/[、,，]/)
        .map((value) => value.trim())
        .filter(Boolean)
      const nextValue = field.multiSelect
        ? values.includes(option) && toggleSelected
          ? values.filter((value) => value !== option).join('、')
          : values.includes(option)
            ? values.join('、')
            : [...values, option].join('、')
        : option
      return { ...current, [field.key]: nextValue, confirmed: false }
    })
    setPackageDraft(null)
  }

  const applyBriefQuickOption = (field: CreationBriefField, option: string) => {
    applyBriefOption(field, option, true)
  }

  const updateCustomOptionInput = (field: CreationBriefField, value: string) => {
    setCustomOptionInputs((current) => ({ ...current, [field.key]: value }))
  }

  const applyCustomOptionInput = (field: CreationBriefField) => {
    const option = String(customOptionInputs[field.key] || '').trim()
    if (!option) return
    applyBriefOption(field, option, false)
    setCustomOptionInputs((current) => ({ ...current, [field.key]: '' }))
  }

  const isBriefQuickOptionSelected = (field: CreationBriefField, option: string) => {
    const value = String(brief[field.key] || '').trim()
    if (!value) return false
    const values = value
      .split(/[、,，]/)
      .map((item) => item.trim())
      .filter(Boolean)
    return field.multiSelect ? values.includes(option) : value === option
  }

  const send = async (explicitInput?: string) => {
    const text = (explicitInput ?? input).trim()
    if (!text || loading) return
    setInput('')
    setError(null)
    setLoading(true)
    addLocalMessage('user', text)
    const pendingId = nextLocalMessageIdRef.current
    nextLocalMessageIdRef.current -= 1
    setMessages((current) => [
      ...current,
      createPendingAssistantStreamMessage(pendingId, 'AI 正在整理起书需求...')
    ])

    try {
      const config = await getResolvedGlobalAiConfig()
      const aiConfig = config ? { ...(config as AiCallerConfig), ragMode: 'off' as const } : null
      if (!isAiConfigReady(aiConfig)) {
        setMessages((current) => current.filter((message) => message.id !== pendingId))
        setError(
          '请先在应用设置 / AI 与模型中完成全局 AI 配置，或完成 Gemini CLI / Ollama 设置'
        )
        return
      }
      let streamedContent = ''
      let streamError = ''
      const queue = createAssistantStreamChunkQueue(() => {
        setMessages((current) =>
          replaceAssistantStreamContent(
            current,
            pendingId,
            buildBookshelfBriefStreamContent(streamedContent)
          )
        )
      })
      await aiPromptStream(
        aiConfig,
        buildBookshelfBriefSystemPrompt(),
        buildBookshelfBriefUserPrompt({ brief, userInput: text, messages }),
        {
          onToken: (token) => {
            streamedContent += token
            queue.push(token)
          },
          onComplete: (content) => {
            streamedContent = content || streamedContent
          },
          onError: (message) => {
            streamError = message
          }
        },
        1400,
        0.55
      )
      await queue.drain()
      if (streamError) {
        setError(streamError)
        setMessages((current) =>
          current.map((message) =>
            message.id === pendingId
              ? { ...message, streaming: false, content: message.content || '生成失败' }
              : message
          )
        )
        return
      }
      const parsed = extractJsonObject(streamedContent) as
        | { assistant_message?: string; brief?: unknown; package?: unknown; bookPackage?: unknown }
        | null
      const nextBrief = parsed?.brief ? mergeCreationBrief(brief, parsed.brief) : brief
      const assistantText = buildBookshelfBriefFinalContent(streamedContent, nextBrief)
      if (parsed?.brief) {
        setBrief((current) => mergeCreationBrief(current, parsed.brief))
        setPackageDraft(null)
      }
      const maybePackage = coerceBookCreationPackage(parsed)
      if (maybePackage && isCreationBriefComplete(nextBrief)) {
        setPackageDraft(stripBookCreationChapterContent(maybePackage))
      }
      setMessages((current) =>
        completeAssistantStreamMessage(current, pendingId, Math.abs(pendingId), assistantText)
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 请求失败')
      setMessages((current) => current.filter((message) => message.id !== pendingId))
    } finally {
      setLoading(false)
    }
  }

  const generatePackage = async () => {
    if (!canGeneratePackage || loading) {
      setError('请先补齐作品名、题材和篇幅这 3 个核心必填项。')
      return
    }
    setError(null)
    setLoading(true)
    setPackageDraft(null)
    setBrief((current) => ({ ...current, confirmed: true }))
    const pendingId = nextLocalMessageIdRef.current
    nextLocalMessageIdRef.current -= 1
    addLocalMessage('user', '请基于核心需求生成筹备包预览。')
    setMessages((current) => [
      ...current,
      createPendingAssistantStreamMessage(pendingId, 'AI 正在生成筹备包...')
    ])

    try {
      const config = await getResolvedGlobalAiConfig()
      const aiConfig = config ? { ...(config as AiCallerConfig), ragMode: 'off' as const } : null
      if (!isAiConfigReady(aiConfig)) {
        setMessages((current) => current.filter((message) => message.id !== pendingId))
        setError(
          '请先在应用设置 / AI 与模型中完成全局 AI 配置，或完成 Gemini CLI / Ollama 设置'
        )
        return
      }
      const prompt = buildBookPackagePrompt(brief)
      let streamedContent = ''
      let streamError = ''
      const queue = createAssistantStreamChunkQueue(() => {
        setMessages((current) =>
          replaceAssistantStreamContent(
            current,
            pendingId,
            buildBookPackageStreamContent(streamedContent)
          )
        )
      })
      await aiPromptStream(
        aiConfig,
        prompt.systemPrompt,
        prompt.userPrompt,
        {
          onToken: (token) => {
            streamedContent += token
            queue.push(token)
          },
          onComplete: (content) => {
            streamedContent = content || streamedContent
          },
          onError: (message) => {
            streamError = message
          }
        },
        3200,
        0.72
      )
      await queue.drain()
      if (streamError) {
        setError(streamError)
        setMessages((current) =>
          current.map((message) =>
            message.id === pendingId
              ? { ...message, streaming: false, content: message.content || '生成失败' }
              : message
          )
        )
        return
      }
      const parsed = extractJsonObject(streamedContent)
      const aiPackage = coerceBookCreationPackage(parsed)
      const pkg = stripBookCreationChapterContent(
        mergeBookCreationPackageWithFallback(aiPackage, buildFallbackBookCreationPackage(brief))
      )
      const validation = validateBookCreationPackage(pkg)
      if (!validation.ok) {
        setError(validation.errors.join('；') || 'AI 返回的筹备包格式无效，请重试。')
        setMessages((current) =>
          current.map((message) =>
            message.id === pendingId
              ? { ...message, streaming: false, content: '筹备包格式无效，请重试。' }
              : message
          )
        )
        return
      }
      setPackageDraft(pkg)
      setMessages((current) =>
        completeAssistantStreamMessage(
          current,
          pendingId,
          Math.abs(pendingId),
          '筹备包预览已生成，请在右侧确认后创建作品。'
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成筹备包失败')
      setMessages((current) => current.filter((message) => message.id !== pendingId))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    sendCommandRef.current = (text) => {
      void send(text)
    }
  })

  const createBookFromPackage = async () => {
    if (!packageDraft || !canCreate) return
    const packageForCreation = stripBookCreationChapterContent(packageDraft)
    setCreating(true)
    setError(null)
    try {
      const result =
        typeof window.api.createBookFromAiPackage === 'function'
          ? ((await window.api.createBookFromAiPackage({
              brief,
              package: packageForCreation,
              messages: messages
                .filter(
                  (message) =>
                    message.role === 'user' || message.role === 'assistant' || message.role === 'system'
                )
                .map((message) => ({
                  role: message.role,
                  content: message.content,
                  metadata: message.metadata
                }))
            })) as AiBookCreationResult)
          : await createBookFromPackageThroughExistingApi(brief, packageForCreation)
      await loadBooks()
      if (result.book?.id) {
        openBook(result.book.id)
        if (result.firstChapterId) await selectChapter(result.firstChapterId)
        openAiAssistant()
      }
      useToastStore.getState().addToast('success', 'AI 筹备包已创建为新作品')
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建作品失败')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--bg-secondary)]">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border-primary)] bg-[var(--bg-primary)] px-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
          <Bot size={17} className="text-[var(--accent-primary)]" />
          <span>AI 创作助手 · 新作品</span>
        </div>
        <button
          type="button"
          onClick={closeAiAssistant}
          title="收起 AI 助手"
          className="rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
        >
          <X size={16} />
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-h-0 flex-col border-r border-[var(--border-primary)]">
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3 select-text">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3 text-xs leading-relaxed text-[var(--text-secondary)]">
                  把你的脑洞直接发给我。你可以一次性回答多个方向，也可以写"章节让 AI 评估""人物让 AI 写"；只有作品名、题材和篇幅会卡住确认。
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {resolveAssistantContext({ currentBookId: null, requestedSurface: 'bookshelf' }).quickActions.map(
                    (action) => (
                      <button
                        key={action.key}
                        type="button"
                        onClick={() => void send(action.input)}
                        className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-2 text-left transition hover:border-[var(--accent-border)]"
                      >
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                          <Sparkles size={13} className="text-[var(--accent-primary)]" />{' '}
                          {action.label}
                        </div>
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`rounded-lg border p-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  message.role === 'user'
                    ? 'ml-8 border-[var(--accent-border)] bg-[var(--accent-surface)] text-[var(--text-primary)]'
                    : 'mr-8 border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-secondary)]'
                }`}
              >
                {message.streaming && (
                  <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold text-[var(--accent-secondary)]">
                    <Loader2 size={11} className="animate-spin" />
                    <span>{message.streamingLabel || 'AI 正在回复...'}</span>
                  </div>
                )}
                {message.content}
              </div>
            ))}

            {error && (
              <div className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-surface)] p-2 text-xs text-[var(--danger-primary)]">
                {error}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-[var(--border-primary)] bg-[var(--bg-primary)] p-3">
            <div className="mb-2 max-h-[220px] overflow-y-auto rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-2">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-[11px] font-bold text-[var(--text-primary)]">快速选择</div>
                <div className="text-[10px] text-[var(--text-muted)]">
                  可点选 / 可多选，也可输入其他
                </div>
              </div>
              <div className="space-y-2">
                {composerOptionFields.map((field) => {
                  const currentValue = String(brief[field.key] || '').trim()
                  return (
                    <div key={`composer-${field.key}`} className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="font-semibold text-[var(--text-secondary)]">
                          {field.label}
                        </span>
                        <span
                          className={`rounded border px-1 py-0.5 ${
                            field.required
                              ? 'border-[var(--accent-border)] text-[var(--accent-secondary)]'
                              : 'border-[var(--border-primary)] text-[var(--text-muted)]'
                          }`}
                        >
                          {field.required ? '必填' : '可选'}
                        </span>
                        {field.multiSelect && (
                          <span className="text-[var(--text-muted)]">可多选</span>
                        )}
                        {currentValue && (
                          <span className="min-w-0 max-w-[180px] truncate text-[var(--success-primary)]">
                            已选：{currentValue}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {field.quickOptions.map((option) => {
                          const selected = isBriefQuickOptionSelected(field, option)
                          return (
                            <button
                              key={`composer-${field.key}-${option}`}
                              type="button"
                              onClick={() => applyBriefQuickOption(field, option)}
                              className={`rounded border px-1.5 py-0.5 text-[10px] transition ${
                                selected
                                  ? 'border-[var(--accent-border)] bg-[var(--accent-surface)] text-[var(--accent-secondary)]'
                                  : 'border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:border-[var(--accent-border)] hover:text-[var(--accent-secondary)]'
                              }`}
                            >
                              {option}
                            </button>
                          )
                        })}
                      </div>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={customOptionInputs[field.key] || ''}
                          onChange={(event) => updateCustomOptionInput(field, event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault()
                              applyCustomOptionInput(field)
                            }
                          }}
                          placeholder={`输入其他${field.label}`}
                          className="field h-7 min-w-0 flex-1 px-2 py-1 text-[10px]"
                        />
                        <button
                          type="button"
                          disabled={!String(customOptionInputs[field.key] || '').trim()}
                          onClick={() => applyCustomOptionInput(field)}
                          className="inline-flex h-7 shrink-0 items-center gap-1 rounded border border-[var(--border-primary)] px-2 text-[10px] font-semibold text-[var(--text-secondary)] hover:border-[var(--accent-border)] hover:text-[var(--accent-secondary)] disabled:opacity-40"
                          title={`加入其他${field.label}`}
                        >
                          <Plus size={11} />
                          加入
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="flex gap-2">
              <textarea
                rows={2}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (shouldSubmitAiAssistantInput(event)) {
                    event.preventDefault()
                    void send()
                  }
                }}
                placeholder="描述新作品想法，或一次性回答多个编号 / 让 AI 评估"
                className="field resize-none text-xs"
              />
              <button
                type="button"
                disabled={!input.trim() || loading}
                onClick={() => void send()}
                className="primary-btn self-stretch px-3"
                title="发送"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-col bg-[var(--bg-primary)]">
          <div className="border-b border-[var(--border-primary)] p-3">
            <div className="text-xs font-bold text-[var(--text-primary)]">起书需求清单</div>
            <div className="mt-1 text-[11px] text-[var(--text-muted)]">
              {missingFields.length === 0
                ? '核心必填已齐；可选项可以留给 AI 评估。'
                : `还缺 ${missingFields.length} 个核心必填项。`}
            </div>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {CREATION_BRIEF_FIELDS.map((field) => {
              const value = String(brief[field.key] || '')
              const complete = value.trim().length > 0
              return (
                <div
                  key={field.key}
                  className="block rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-2"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="min-w-0 text-[11px] font-semibold text-[var(--text-primary)]">
                      {field.label}
                    </span>
                    <span
                      className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] ${
                        field.required
                          ? 'border-[var(--accent-border)] text-[var(--accent-secondary)]'
                          : 'border-[var(--border-primary)] text-[var(--text-muted)]'
                      }`}
                    >
                      {field.required ? '必填' : '可选'}
                    </span>
                    {complete ? (
                      <Check size={12} className="shrink-0 text-[var(--success-primary)]" />
                    ) : null}
                  </div>
                  <textarea
                    rows={2}
                    value={value}
                    onChange={(event) => updateBriefField(field.key, event.target.value)}
                    placeholder={field.prompt}
                    className="field min-h-[54px] resize-none text-[11px]"
                  />
                </div>
              )
            })}

            <div className="space-y-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3">
              <div className="text-[11px] leading-relaxed text-[var(--text-muted)]">
                第一步生成筹备包预览；第二步确认预览后创建作品。
              </div>
              <button
                type="button"
                disabled={!canGeneratePackage}
                onClick={() => void generatePackage()}
                className="primary-btn w-full justify-center text-xs disabled:opacity-40"
              >
                {packageDraft ? '重新生成筹备包预览' : '确认并生成筹备包预览'}
              </button>
            </div>

            {packageDraft && (
              <div className="space-y-2 rounded-lg border border-[var(--warning-border)] bg-[var(--warning-surface)] p-3 text-xs">
                <div className="font-bold text-[var(--warning-primary)]">筹备包预览</div>
                <div className="text-[var(--text-primary)]">《{packageDraft.book.title}》</div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--text-secondary)]">
                  <div>分卷 {packageDraft.volumes.length}</div>
                  <div>
                    章节 {packageDraft.volumes.flatMap((volume) => volume.chapters).length}
                  </div>
                  <div>人物 {packageDraft.characters.length}</div>
                  <div>设定 {packageDraft.wikiEntries.length}</div>
                  <div>剧情 {packageDraft.plotNodes.length}</div>
                  <div>伏笔 {packageDraft.foreshadowings.length}</div>
                  <div className="col-span-2">正文待 AI 起草</div>
                </div>
                {packageValidation.errors.length > 0 && (
                  <div className="text-[var(--danger-primary)]">
                    {packageValidation.errors.join('；')}
                  </div>
                )}
                <button
                  type="button"
                  disabled={!canCreate}
                  onClick={() => void createBookFromPackage()}
                  className="primary-btn mt-2 w-full justify-center text-xs disabled:opacity-40"
                >
                  {creating ? '创建中...' : '创建作品'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
