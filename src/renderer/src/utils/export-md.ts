interface ExportChapter {
  title: string
  content: string | null
  volume_title: string
}

function htmlToMarkdown(html: string): string {
  let s = html || ''
  s = s.replace(/<p>/gi, '').replace(/<\/p>/gi, '\n\n')
  s = s.replace(/<br\s*\/?>/gi, '\n')
  s = s.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
  s = s.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
  s = s.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
  s = s.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*')
  s = s.replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, '\n\n### $1\n\n')
  s = s.replace(/<[^>]+>/g, '')
  s = s.replace(/&nbsp;/g, ' ')
  s = s.replace(/&lt;/g, '<')
  s = s.replace(/&gt;/g, '>')
  s = s.replace(/&amp;/g, '&')
  return s.trim()
}

export function exportToMarkdown(bookTitle: string, author: string, chapters: ExportChapter[]): string {
  let md = `# ${bookTitle}\n\n作者：${author}\n\n---\n\n`
  let lastVolume = ''
  for (const ch of chapters) {
    if (ch.volume_title !== lastVolume) {
      md += `## ${ch.volume_title}\n\n`
      lastVolume = ch.volume_title
    }
    md += `### ${ch.title}\n\n`
    md += `${htmlToMarkdown(ch.content || '')}\n\n`
  }
  return md
}
