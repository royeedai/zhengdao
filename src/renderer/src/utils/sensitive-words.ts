const DEFAULT_WORDS = [
  '习近平', '总书记', '国务院', '政治局', '中共', '共产党',
  '法轮功', '六四', '天安门', '台独', '藏独', '疆独',
  '色情', '嫖娼', '卖淫', '毒品', '贩毒', '赌博',
  '自杀指南', '炸弹制造', '枪支', '弹药'
]

const STRICT_WORDS = [
  ...DEFAULT_WORDS,
  '操', '他妈', '去死', '废物', '垃圾', '傻逼', '脑残',
  '血腥', '肢解', '虐杀', '强奸'
]

export function getSensitiveWords(listType: string): string[] {
  switch (listType) {
    case 'strict':
      return STRICT_WORDS
    case 'none':
      return []
    default:
      return DEFAULT_WORDS
  }
}

export function checkSensitive(text: string, words: string[]): { word: string; index: number }[] {
  const results: { word: string; index: number }[] = []
  for (const word of words) {
    let idx = text.indexOf(word)
    while (idx !== -1) {
      results.push({ word, index: idx })
      idx = text.indexOf(word, idx + 1)
    }
  }
  return results.sort((a, b) => a.index - b.index)
}
