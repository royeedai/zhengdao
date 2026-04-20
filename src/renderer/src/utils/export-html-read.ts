interface ExportChapter {
  title: string
  content: string | null
  volume_title: string
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function exportToReadingHtml(bookTitle: string, author: string, chapters: ExportChapter[]): string {
  const tocItems: string[] = []
  const mainParts: string[] = []
  let lastVol = ''
  let volOpen = false
  let i = 0
  for (const ch of chapters) {
    i += 1
    const id = `ch-${i}`
    tocItems.push(`<li><a href="#${id}">${escapeHtml(ch.title)}</a></li>`)
    if (ch.volume_title !== lastVol) {
      if (volOpen) mainParts.push('</section>')
      mainParts.push(`<section class="volume"><h2 class="volume-title">${escapeHtml(ch.volume_title)}</h2>`)
      lastVol = ch.volume_title
      volOpen = true
    }
    const inner = ch.content || '<p></p>'
    mainParts.push(
      `<article id="${id}" class="chapter"><h3>${escapeHtml(ch.title)}</h3><div class="chapter-body">${inner}</div></article>`
    )
  }
  if (volOpen) mainParts.push('</section>')

  const doc = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${escapeHtml(
    bookTitle
  )}</title><style>
body{font-family:"Source Han Serif SC","Noto Serif SC",Georgia,serif;line-height:1.85;color:#222;max-width:42rem;margin:0 auto;padding:1.5rem;background:#faf8f5;}
header.cover{text-align:center;padding:3rem 0;border-bottom:1px solid #ddd;margin-bottom:2rem;}
header.cover h1{font-size:1.75rem;margin:0 0 .5rem;}
header.cover .meta{color:#666;font-size:.95rem;}
nav.toc{margin-bottom:3rem;} nav.toc ol{padding-left:1.25rem;}
.volume-title{color:#444;margin-top:2.5rem;font-size:1.35rem;border-bottom:1px solid #e0dcd4;padding-bottom:.35rem;}
.chapter{margin-bottom:3rem;} .chapter h3{font-size:1.15rem;margin-bottom:1rem;}
.chapter-body p{text-indent:2em;margin:0 0 .75em;}
</style></head><body>
<header class="cover"><h1>${escapeHtml(bookTitle)}</h1><p class="meta">${escapeHtml(author ? `作者：${author}` : '')}</p></header>
<nav class="toc"><h2>目录</h2><ol>${tocItems.join('')}</ol></nav>
<main>${mainParts.join('\n')}</main>
</body></html>`
  return doc
}
