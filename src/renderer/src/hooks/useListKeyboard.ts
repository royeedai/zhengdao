import { useCallback, useEffect, useMemo, useState } from 'react'
import type { KeyboardEvent } from 'react'

interface UseListKeyboardOptions<T> {
  items: T[]
  onPick: (item: T, index: number) => void
  onEscape?: () => void
}

export function useListKeyboard<T>({ items, onPick, onEscape }: UseListKeyboardOptions<T>) {
  const [cursor, setCursor] = useState(0)
  const selectedIndex = items.length === 0 ? 0 : Math.min(cursor, items.length - 1)

  useEffect(() => {
    setCursor(0)
  }, [items])

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        if (items.length > 0) setCursor((index) => (Math.min(index, items.length - 1) + 1) % items.length)
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        if (items.length > 0) setCursor((index) => (Math.min(index, items.length - 1) - 1 + items.length) % items.length)
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        const item = items[selectedIndex]
        if (item) onPick(item, selectedIndex)
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        onEscape?.()
      }
    },
    [items, onEscape, onPick, selectedIndex]
  )

  return useMemo(
    () => ({
      cursor,
      selectedIndex,
      setCursor,
      onKeyDown
    }),
    [cursor, onKeyDown, selectedIndex]
  )
}
