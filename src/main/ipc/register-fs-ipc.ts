import { BrowserWindow, dialog, ipcMain } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { readDocxPlainText } from '../utils/read-docx-text'
import { assertAllowedWritePath } from './path-security'

/**
 * SPLIT-007 — fs:* + dialog:* + export:* IPC handlers.
 *
 * Filesystem-touching surface. Every renderer-supplied path goes through
 * `assertAllowedWritePath` before any actual write, so a future "what
 * directories can the renderer write to?" change touches one helper file.
 */
export function registerFsIpc(): void {
  // Save dialog (renderer asks user to pick destination)
  ipcMain.handle('dialog:showSave', async (_, options) => {
    const result = await dialog.showSaveDialog(options)
    return result
  })

  // Restricted write — only allowed roots permitted
  ipcMain.handle('fs:writeFile', (_, filePath: string, data: string | Buffer) => {
    const resolved = assertAllowedWritePath(filePath)
    writeFileSync(resolved, data)
  })

  // PDF export via offscreen BrowserWindow
  ipcMain.handle('export:pdf', async (_, html: string, savePath: string) => {
    const resolved = assertAllowedWritePath(savePath)
    const win = new BrowserWindow({
      show: false,
      width: 794,
      height: 1123,
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    })
    try {
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
      await new Promise<void>((res, rej) => {
        win.webContents.once('did-fail-load', (_e, code, desc) =>
          rej(new Error(desc || `load failed (${code})`))
        )
        win.webContents.once('did-finish-load', () => res())
      })
      const pdf = await win.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        margins: { marginType: 'custom', top: 48, bottom: 48, left: 48, right: 48 }
      })
      writeFileSync(resolved, pdf)
    } finally {
      win.destroy()
    }
  })

  // Open dialogs (import file + open directory)
  ipcMain.handle(
    'dialog:openImportFile',
    async (): Promise<{ path: string; content: string; kind: 'txt' | 'docx' } | null> => {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: '文稿', extensions: ['txt', 'docx'] },
          { name: '纯文本', extensions: ['txt'] },
          { name: 'Word', extensions: ['docx'] }
        ]
      })
      if (result.canceled || !result.filePaths[0]) return null
      const filePath = result.filePaths[0]
      const lower = filePath.toLowerCase()
      if (lower.endsWith('.docx')) {
        const content = await readDocxPlainText(filePath)
        return { path: filePath, content, kind: 'docx' }
      }
      const content = readFileSync(filePath, 'utf-8')
      return { path: filePath, content, kind: 'txt' }
    }
  )

  ipcMain.handle('dialog:openDirectory', async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || !result.filePaths[0]) return null
    return result.filePaths[0]
  })
}
