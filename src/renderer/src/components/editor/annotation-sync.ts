import type { Annotation } from '@/types'

let annotations: Annotation[] = []

export function setEditorAnnotations(next: Annotation[]) {
  annotations = next
}

export function getEditorAnnotations() {
  return annotations
}

export function appendEditorAnnotation(row: Annotation) {
  annotations = [...annotations, row]
}
