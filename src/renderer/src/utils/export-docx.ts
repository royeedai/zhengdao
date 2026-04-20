import { Document, Packer, Paragraph, HeadingLevel, TextRun, TableOfContents, StyleLevel } from 'docx'

interface ExportChapter {
  title: string
  content: string | null
  volume_title: string
}

function htmlToPlainLines(html: string): string[] {
  const div = document.createElement('div')
  div.innerHTML = html || ''
  const text = div.innerText || div.textContent || ''
  return text.split('\n').filter((l) => l.trim())
}

export async function generateDocx(
  title: string,
  author: string,
  chapters: ExportChapter[]
): Promise<Uint8Array> {
  const children: (Paragraph | TableOfContents)[] = []

  children.push(
    new Paragraph({
      text: `《${title}》`,
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 }
    })
  )
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `作者：${author || '未署名'}`, italics: true, size: 24 })],
      spacing: { after: 400 }
    })
  )

  children.push(
    new Paragraph({
      text: '目 录',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 200 }
    })
  )
  children.push(
    new TableOfContents('目录', {
      hyperlink: true,
      headingStyleRange: '1-2',
      stylesWithLevels: [
        new StyleLevel('Heading1', 1),
        new StyleLevel('Heading2', 2)
      ]
    })
  )
  children.push(new Paragraph({ spacing: { after: 400 } }))

  let lastVolume = ''
  for (const ch of chapters) {
    if (ch.volume_title !== lastVolume) {
      children.push(
        new Paragraph({
          text: ch.volume_title,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        })
      )
      lastVolume = ch.volume_title
    }

    children.push(
      new Paragraph({
        text: ch.title,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 }
      })
    )

    const lines = htmlToPlainLines(ch.content || '')
    for (const line of lines) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: '\u3000\u3000' + line.trim(), size: 24, font: '宋体' })],
          spacing: { after: 100, line: 400 }
        })
      )
    }
  }

  const doc = new Document({
    sections: [{ children }]
  })

  const buffer = await Packer.toBuffer(doc)
  return new Uint8Array(buffer)
}
