import { useMemo } from 'react'

export function useWordCount(content: string | null | undefined): number {
  return useMemo(() => {
    if (!content) return 0
    const text = content.replace(/<[^>]+>/g, '').replace(/\s/g, '')
    return text.length
  }, [content])
}
