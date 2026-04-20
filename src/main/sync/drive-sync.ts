import type { GoogleAuth } from '../auth/google-auth'
import { getDb } from '../database/connection'
import * as appStateRepo from '../database/app-state-repo'
import { exportBookPayload } from './book-export'

const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files'
const DRIVE_FILES = 'https://www.googleapis.com/drive/v3/files'

export interface CloudBookFile {
  id: string
  name: string
  modifiedTime: string
}

export class DriveSync {
  constructor(private googleAuth: GoogleAuth) {}

  async syncBook(bookId: number): Promise<void> {
    const token = await this.googleAuth.getAccessToken()
    if (!token) throw new Error('Not authenticated')

    const db = getDb()
    const queueId = db
      .prepare(
        `INSERT INTO sync_queue (book_id, action, status) VALUES (?, 'upload', 'pending')`
      )
      .run(bookId).lastInsertRowid as number

    try {
      const payload = exportBookPayload(bookId)
      const body = JSON.stringify(payload)
      const fileName = `book_${bookId}.json`

      const existingId = await this.findFileIdByName(token, fileName)

      if (existingId) {
        await this.patchMultipart(token, existingId, fileName, body)
      } else {
        await this.createMultipart(token, fileName, body)
      }

      db.prepare(`UPDATE sync_queue SET status = 'completed' WHERE id = ?`).run(queueId)
      appStateRepo.setAppState(
        `sync_book_${bookId}`,
        JSON.stringify({ at: new Date().toISOString(), file: fileName })
      )
    } catch (e) {
      db.prepare(`UPDATE sync_queue SET status = 'failed' WHERE id = ?`).run(queueId)
      throw e
    }
  }

  private async findFileIdByName(token: string, name: string): Promise<string | null> {
    const q = `name='${name.replace(/'/g, "\\'")}' and trashed=false`
    const url = `${DRIVE_FILES}?spaces=appDataFolder&q=${encodeURIComponent(q)}&fields=files(id,name)`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) {
      const t = await res.text()
      throw new Error(`Drive list failed: ${res.status} ${t}`)
    }
    const data = (await res.json()) as { files?: { id: string }[] }
    const first = data.files?.[0]
    return first?.id ?? null
  }

  private async createMultipart(token: string, fileName: string, jsonBody: string): Promise<void> {
    const boundary = 'zd_' + Math.random().toString(36).slice(2)
    const meta = JSON.stringify({ name: fileName, parents: ['appDataFolder'] })
    const parts =
      `--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      meta +
      '\r\n' +
      `--${boundary}\r\n` +
      'Content-Type: application/json\r\n\r\n' +
      jsonBody +
      '\r\n' +
      `--${boundary}--`

    const res = await fetch(`${DRIVE_UPLOAD}?uploadType=multipart`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: parts
    })
    if (!res.ok) {
      const t = await res.text()
      throw new Error(`Drive create failed: ${res.status} ${t}`)
    }
  }

  private async patchMultipart(token: string, fileId: string, fileName: string, jsonBody: string): Promise<void> {
    const boundary = 'zd_' + Math.random().toString(36).slice(2)
    const meta = JSON.stringify({ name: fileName })
    const parts =
      `--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      meta +
      '\r\n' +
      `--${boundary}\r\n` +
      'Content-Type: application/json\r\n\r\n' +
      jsonBody +
      '\r\n' +
      `--${boundary}--`

    const res = await fetch(`${DRIVE_UPLOAD}/${encodeURIComponent(fileId)}?uploadType=multipart`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: parts
    })
    if (!res.ok) {
      const t = await res.text()
      throw new Error(`Drive update failed: ${res.status} ${t}`)
    }
  }

  async listCloudBooks(): Promise<CloudBookFile[]> {
    const token = await this.googleAuth.getAccessToken()
    if (!token) throw new Error('Not authenticated')

    const q = "name contains 'book_' and name contains '.json' and trashed=false"
    const url = `${DRIVE_FILES}?spaces=appDataFolder&q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime)`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) {
      const t = await res.text()
      throw new Error(`Drive list failed: ${res.status} ${t}`)
    }
    const data = (await res.json()) as {
      files?: Array<{ id: string; name: string; modifiedTime: string }>
    }
    return (data.files || []).map((f) => ({
      id: f.id,
      name: f.name,
      modifiedTime: f.modifiedTime || ''
    }))
  }

  async downloadBook(fileId: string): Promise<unknown> {
    const token = await this.googleAuth.getAccessToken()
    if (!token) throw new Error('Not authenticated')

    const url = `${DRIVE_FILES}/${encodeURIComponent(fileId)}?alt=media`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) {
      const t = await res.text()
      throw new Error(`Drive download failed: ${res.status} ${t}`)
    }
    const text = await res.text()
    return JSON.parse(text) as unknown
  }
}
