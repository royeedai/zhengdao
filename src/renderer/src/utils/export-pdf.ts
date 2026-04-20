export interface PdfExportChapter {
  title: string
  content: string | null
  volume_title: string
}

export interface PdfVolumeSlice {
  title: string
  chapters: Array<{ title: string; content: string | null }>
}

export function chaptersToVolumeSlices(chapters: PdfExportChapter[]): PdfVolumeSlice[] {
  const out: PdfVolumeSlice[] = []
  let volKey = ''
  let cur: PdfVolumeSlice | null = null
  for (const ch of chapters) {
    if (ch.volume_title !== volKey) {
      volKey = ch.volume_title
      cur = { title: ch.volume_title, chapters: [] }
      out.push(cur)
    }
    cur!.chapters.push({ title: ch.title, content: ch.content })
  }
  return out
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function generatePDFHtml(bookTitle: string, author: string, volumes: PdfVolumeSlice[]): string {
  let toc = '<div class="toc"><h2 class="toc-title">目录</h2><ul>'
  let body = ''
  let n = 0
  for (const vol of volumes) {
    body += `<div class="volume"><h2 class="volume-title">${escapeHtml(vol.title)}</h2>`
    for (const ch of vol.chapters) {
      n += 1
      const anchor = `chapter-${n}`
      toc += `<li><a href="#${anchor}">${escapeHtml(ch.title)}</a></li>`
      body += `<section id="${anchor}" class="chapter"><h3>${escapeHtml(ch.title)}</h3><div class="body">${ch.content || '<p></p>'}</div></section>`
    }
    body += '</div>'
  }
  toc += '</ul></div>'
  const meta = author ? `<p class="author">${escapeHtml(`作者：${author}`)}</p>` : ''
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"/><style>
@page { size: A4; margin: 18mm; }
body{font-family:"PingFang SC","Microsoft YaHei",sans-serif;font-size:11pt;line-height:1.65;color:#111;}
.cover{text-align:center;padding:48px 0 64px;border-bottom:1px solid #ccc;margin-bottom:32px;}
.cover h1{font-size:22pt;margin:0 0 12px;font-weight:700;}
.author{font-size:11pt;color:#444;margin:0;}
.toc{margin-bottom:40px;page-break-after:always;}
.toc-title{font-size:14pt;margin:0 0 16px;}
.toc ul{margin:0;padding-left:24px;}
.toc li{margin:6px 0;}
.volume{margin-bottom:28px;}
.volume-title{font-size:13pt;margin:24px 0 12px;color:#222;border-bottom:1px solid #ddd;padding-bottom:6px;}
.chapter{margin-bottom:20px;}
.chapter h3{font-size:12pt;margin:16px 0 10px;}
.body p{text-indent:2em;margin:0 0 .6em;}
</style></head><body>
<div class="cover"><h1>${escapeHtml(bookTitle)}</h1>${meta}</div>
${toc}
${body}
</body></html>`
}
