const STOP_WORDS = new Set([
  '的',
  '了',
  '是',
  '在',
  '我',
  '他',
  '她',
  '你',
  '们',
  '这',
  '那',
  '个',
  '也',
  '就',
  '和',
  '有',
  '与',
  '为',
  '以',
  '及',
  '或',
  '但',
  '而',
  '所',
  '被',
  '把',
  '让',
  '从',
  '对',
  '将',
  '着',
  '过',
  '吗',
  '吧',
  '呢',
  '啊',
  '呀',
  '嘛',
  '唉',
  '嗯',
  '唉呀'
])

export interface TextAnalysisResult {
  totalCharacters: number
  wordCount: number
  sentenceCount: number
  paragraphCount: number
  avgSentenceLength: number
  avgParagraphLength: number
  topWords: { word: string; count: number }[]
}

function collectTokens(text: string): string[] {
  const tokens: string[] = []
  let latin = ''
  const flushLatin = () => {
    if (latin.length > 0) {
      tokens.push(latin.toLowerCase())
      latin = ''
    }
  }
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (/[\u4e00-\u9fff]/.test(ch)) {
      flushLatin()
      tokens.push(ch)
    } else if (/[a-zA-Z]/.test(ch)) {
      latin += ch
    } else {
      flushLatin()
    }
  }
  flushLatin()
  return tokens
}

export function analyzeText(raw: string): TextAnalysisResult {
  const normalized = raw.replace(/\r\n/g, '\n')
  const paragraphParts = normalized.split(/\n+/).map((p) => p.trim()).filter(Boolean)
  const paragraphCount = paragraphParts.length || (normalized.trim() ? 1 : 0)

  const sentences = normalized
    .split(/[。！？!?]+/)
    .map((s) => s.replace(/\s+/g, '').trim())
    .filter(Boolean)
  const sentenceCount = sentences.length || (normalized.trim() ? 1 : 0)

  const plainForChars = normalized.replace(/\s/g, '')
  const totalCharacters = plainForChars.length

  const tokens = collectTokens(normalized.replace(/\s+/g, ''))
  const wordCount = tokens.length

  const sentenceUnits =
    sentences.length > 0 ? sentences : normalized.trim() ? [normalized.replace(/\s+/g, '')] : []
  const sentenceWordCounts = sentenceUnits.map((s) => collectTokens(s).length)
  const avgSentenceLength =
    sentenceWordCounts.length > 0
      ? sentenceWordCounts.reduce((a, b) => a + b, 0) / sentenceWordCounts.length
      : 0

  const paragraphWordCounts =
    paragraphParts.length > 0
      ? paragraphParts.map((p) => collectTokens(p.replace(/\s+/g, '')).length)
      : normalized.trim()
        ? [wordCount]
        : [0]
  const avgParagraphLength =
    paragraphWordCounts.reduce((a, b) => a + b, 0) / Math.max(1, paragraphWordCounts.length)

  const freq = new Map<string, number>()
  for (const w of tokens) {
    if (STOP_WORDS.has(w)) continue
    if (w.length === 1 && !/[\u4e00-\u9fff]/.test(w)) continue
    freq.set(w, (freq.get(w) ?? 0) + 1)
  }
  const topWords = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, count]) => ({ word, count }))

  return {
    totalCharacters,
    wordCount,
    sentenceCount,
    paragraphCount,
    avgSentenceLength,
    avgParagraphLength,
    topWords
  }
}
