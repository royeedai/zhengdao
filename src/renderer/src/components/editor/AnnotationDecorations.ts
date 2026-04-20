import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Node as PMNode } from '@tiptap/pm/model'
import type { Annotation } from '@/types'

const BLOCK_SEP = '\n'

export const annotationsPluginKey = new PluginKey<DecorationSet>('chapterAnnotations')

function flatOffsetToDocPos(doc: PMNode, offset: number): number {
  const maxLen = doc.textBetween(0, doc.content.size, BLOCK_SEP).length
  if (offset >= maxLen) return doc.content.size
  if (offset <= 0) return 0
  let lo = 0
  let hi = doc.content.size
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    const len = doc.textBetween(0, mid, BLOCK_SEP).length
    if (len < offset) lo = mid + 1
    else hi = mid
  }
  return lo
}

function buildDecorationSet(doc: PMNode, annotations: readonly Annotation[]): DecorationSet {
  const flat = doc.textBetween(0, doc.content.size, BLOCK_SEP)
  const decorations: Decoration[] = []
  const sorted = [...annotations].sort((a, b) => a.id - b.id)

  let searchStart = 0
  for (const ann of sorted) {
    const anchor = ann.text_anchor
    if (!anchor) continue

    const idx = flat.indexOf(anchor, searchStart)
    if (idx === -1) continue

    const from = flatOffsetToDocPos(doc, idx)
    const to = flatOffsetToDocPos(doc, idx + anchor.length)
    if (from >= to) continue

    decorations.push(
      Decoration.inline(from, to, {
        class: 'annotation-mark',
        'data-tooltip': ann.content,
        'data-annotation-id': String(ann.id)
      })
    )

    searchStart = idx + anchor.length
  }

  return DecorationSet.create(doc, decorations)
}

export function createAnnotationExtension(getAnnotations: () => readonly Annotation[]) {
  return Extension.create({
    name: 'chapterAnnotations',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: annotationsPluginKey,
          state: {
            init(_, state) {
              return buildDecorationSet(state.doc, getAnnotations())
            },
            apply(tr, oldSet, _oldState, newState) {
              if (tr.docChanged || tr.getMeta('annotationsRefresh')) {
                return buildDecorationSet(newState.doc, getAnnotations())
              }
              return oldSet.map(tr.mapping, newState.doc)
            }
          },
          props: {
            decorations(state) {
              return annotationsPluginKey.getState(state) ?? DecorationSet.empty
            }
          }
        })
      ]
    }
  })
}
