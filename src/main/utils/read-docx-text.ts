import yauzl from 'yauzl'

function xmlToPlainText(xml: string): string {
  let text = xml.replace(/<w:p\b[^>]*>/gi, '\n')
  text = text.replace(/<[^>]+>/g, '')
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
  text = text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n')
  return text.trim()
}

export function readDocxPlainText(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) {
        reject(err || new Error('无法打开 DOCX'))
        return
      }

      let extracted: string | null = null

      const safeClose = () => {
        try {
          zipfile.close()
        } catch {
          void 0
        }
      }

      zipfile.on('error', (e) => {
        safeClose()
        reject(e)
      })

      zipfile.on('end', () => {
        safeClose()
        if (extracted !== null) resolve(extracted)
        else reject(new Error('DOCX 中未找到正文'))
      })

      zipfile.readEntry()

      zipfile.on('entry', (entry) => {
        if (entry.fileName !== 'word/document.xml') {
          zipfile.readEntry()
          return
        }

        zipfile.openReadStream(entry, (e2, readStream) => {
          if (e2 || !readStream) {
            reject(e2 || new Error('读取 DOCX 失败'))
            return
          }
          const chunks: Buffer[] = []
          readStream.on('data', (c: Buffer) => chunks.push(c))
          readStream.on('error', reject)
          readStream.on('end', () => {
            extracted = xmlToPlainText(Buffer.concat(chunks).toString('utf8'))
            zipfile.readEntry()
          })
        })
      })
    })
  })
}
