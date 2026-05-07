import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

const focusModePluginKey = new PluginKey<{ tick: number }>('focusMode')

export function createFocusModeExtension(getFocusMode: () => boolean) {
  return Extension.create({
    name: 'focusMode',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: focusModePluginKey,
          state: {
            init: () => ({ tick: 0 }),
            apply(tr, prev) {
              if (tr.getMeta('focusModeToggle')) {
                return { tick: prev.tick + 1 }
              }
              return prev
            }
          },
          props: {
            decorations(state) {
              void focusModePluginKey.getState(state)
              if (!getFocusMode()) return DecorationSet.empty
              const { doc, selection } = state
              const decorations: Decoration[] = []
              const $pos = selection.$head
              const resolvedPos = doc.resolve($pos.pos)
              let depth = resolvedPos.depth
              while (depth > 0 && resolvedPos.node(depth).type.name !== 'paragraph') {
                depth--
              }
              if (depth > 0) {
                const start = resolvedPos.before(depth)
                const end = resolvedPos.after(depth)
                decorations.push(Decoration.node(start, end, { class: 'is-focused' }))
              }
              return DecorationSet.create(doc, decorations)
            }
          }
        })
      ]
    }
  })
}

export function ensureHtmlContent(text: string): string {
  const value = text.trim()
  if (!value) return ''
  return /<\/?[a-z][^>]*>/i.test(value) ? value : plainToHtml(value)
}

export function countPlainWords(text: string): number {
  return text.replace(/\s/g, '').length
}

export function scheduleIdleWork(callback: () => void, timeout = 450): () => void {
  const idleWindow = window as Window & {
    requestIdleCallback?: (cb: IdleRequestCallback, options?: IdleRequestOptions) => number
    cancelIdleCallback?: (handle: number) => void
  }
  if (typeof idleWindow.requestIdleCallback === 'function') {
    const id = idleWindow.requestIdleCallback(callback, { timeout })
    return () => idleWindow.cancelIdleCallback?.(id)
  }
  const id = window.setTimeout(callback, timeout)
  return () => window.clearTimeout(id)
}

function plainToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p>${part.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>`)
    .join('')
}
