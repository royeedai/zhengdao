export interface ImportedChapter {
  title: string
  content: string
}

const HEADER =
  /^(第[一二三四五六七八九十百千零〇两0-9]+[章节回卷集部]|Chapter\s+\d+|序章|楔子|引子|尾声|后记|番外)[：:．.\s]*(.*)$/i

export function parseTxtImport(text: string): ImportedChapter[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n')
  const out: ImportedChapter[] = []
  let currentTitle = '正文'
  let buf: string[] = []

  const flush = () => {
    const content = buf.join('\n').trim()
    buf = []
    out.push({ title: currentTitle, content: content || ' ' })
  }

  for (const line of lines) {
    const trimmed = line.trim()
    const m = trimmed.match(HEADER)
    if (m && trimmed === line) {
      if (buf.length > 0) flush()
      const rest = (m[2] || '').trim()
      currentTitle = rest ? `${m[1]} ${rest}`.trim() : m[1]!
      continue
    }
    buf.push(line)
  }

  if (buf.length > 0 || out.length === 0) flush()

  return out
}
