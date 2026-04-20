import type { PlatformPreset } from './platform-presets'

interface ExportChapter {
  title: string
  content: string | null
  volume_title: string
}

function legacyHtmlToText(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html || ''
  const text = div.innerText || div.textContent || ''
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return ''
      return '\u3000\u3000' + trimmed
    })
    .join('\n')
}

function htmlToFormattedText(html: string, preset: PlatformPreset): string {
  const div = document.createElement('div')
  div.innerHTML = html || ''
  const raw = (div.innerText || div.textContent || '').replace(/\r/g, '')
  const paragraphs = raw
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (paragraphs.length === 0) return ''
  const sep = preset.blankLineBetweenParagraphs ? '\n\n' : '\n'
  return paragraphs
    .map((para) => {
      const lines = para
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
      return lines
        .map((line) => {
          let t = line
          if (preset.removeExtraSpaces) t = t.replace(/\s+/g, ' ')
          if (!t) return ''
          return preset.indent ? '\u3000\u3000' + t : t
        })
        .filter(Boolean)
        .join('\n')
    })
    .join(sep)
}

export function generateTxt(
  title: string,
  author: string,
  chapters: ExportChapter[],
  preset?: PlatformPreset
): string {
  const bodyLine = (html: string) =>
    preset ? htmlToFormattedText(html, preset) : legacyHtmlToText(html)

  let output = `《${title}》\n作者：${author || '未署名'}\n`

  let lastVolume = ''
  for (const ch of chapters) {
    if (ch.volume_title !== lastVolume) {
      output += `\n\n${'═'.repeat(40)}\n${ch.volume_title}\n${'═'.repeat(40)}\n`
      lastVolume = ch.volume_title
    }
    output += `\n\n${ch.title}\n${'─'.repeat(30)}\n\n`
    output += bodyLine(ch.content || '') + '\n'
  }

  return output
}
