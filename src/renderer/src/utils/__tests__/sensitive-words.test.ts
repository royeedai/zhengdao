import { describe, it, expect } from 'vitest'
import { getSensitiveWords, checkSensitive } from '../sensitive-words'

describe('getSensitiveWords', () => {
  it('returns default words for "default" list type', () => {
    const words = getSensitiveWords('default')
    expect(words.length).toBeGreaterThan(0)
    expect(words).toContain('赌博')
  })

  it('returns strict words for "strict" list type', () => {
    const words = getSensitiveWords('strict')
    expect(words.length).toBeGreaterThan(getSensitiveWords('default').length)
  })

  it('returns empty array for "none"', () => {
    expect(getSensitiveWords('none')).toEqual([])
  })

  it('returns default words for unknown list type', () => {
    expect(getSensitiveWords('unknown')).toEqual(getSensitiveWords('default'))
  })
})

describe('checkSensitive', () => {
  it('finds sensitive words with correct indices', () => {
    const results = checkSensitive('这里有赌博和毒品', ['赌博', '毒品'])
    expect(results).toHaveLength(2)
    expect(results[0].word).toBe('赌博')
    expect(results[1].word).toBe('毒品')
    expect(results[0].index).toBeLessThan(results[1].index)
  })

  it('returns empty array when no matches', () => {
    const results = checkSensitive('正常文本', ['赌博'])
    expect(results).toEqual([])
  })

  it('finds multiple occurrences of the same word', () => {
    const results = checkSensitive('赌博就是赌博', ['赌博'])
    expect(results).toHaveLength(2)
  })

  it('returns results sorted by index', () => {
    const results = checkSensitive('毒品和赌博', ['赌博', '毒品'])
    expect(results[0].index).toBeLessThan(results[1].index)
  })

  it('handles empty word list', () => {
    expect(checkSensitive('any text', [])).toEqual([])
  })

  it('handles empty text', () => {
    expect(checkSensitive('', ['赌博'])).toEqual([])
  })
})
