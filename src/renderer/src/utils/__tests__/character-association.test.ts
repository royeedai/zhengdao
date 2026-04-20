import { describe, expect, it } from 'vitest'
import { collectCharacterIdsFromContent } from '../character-association'

describe('collectCharacterIdsFromContent', () => {
  const characters = [
    { id: 1, name: '张三' },
    { id: 2, name: '张三丰' },
    { id: 3, name: '李四' }
  ]

  it('combines mention ids with full-name text matches without rewriting content', () => {
    expect(
      collectCharacterIdsFromContent({
        plainText: '张三丰出手后，李四看见张三丰和张三都在场。',
        mentionIds: [1],
        characters
      })
    ).toEqual([1, 2, 3])
  })

  it('matches longer names first so short names do not swallow them', () => {
    expect(
      collectCharacterIdsFromContent({
        plainText: '张三丰没有理会张三。',
        mentionIds: [],
        characters
      })
    ).toEqual([1, 2])
  })
})
