import { createHash } from 'crypto'
import { app } from 'electron'
import { mkdir, writeFile } from 'fs/promises'
import { extname, join } from 'path'
import { executeOfficialSkill } from './skill-execute-service'
import { insertVisualAssets, listVisualAssets } from '../database/pro-feature-repo'
import type { VisualAsset, VisualGenerateInput, VisualGenerateResult } from '../../shared/visual'

type VisualCandidate = {
  url: string
  localPath?: string
  mimeType?: string
  sha256?: string
  fileSize?: number
  promptUsed?: string
  width?: number
  height?: number
  [key: string]: unknown
}

function extractCandidates(output: unknown): VisualCandidate[] {
  if (!output || typeof output !== 'object') return []
  const candidates = (output as { candidates?: unknown }).candidates
  if (!Array.isArray(candidates)) return []
  return candidates.filter((item): item is { url: string; [key: string]: unknown } =>
    Boolean(item && typeof item === 'object' && typeof (item as { url?: unknown }).url === 'string')
  )
}

function extractProvider(output: unknown): string {
  if (!output || typeof output !== 'object') return ''
  const metadata = (output as { metadata?: unknown }).metadata
  if (!metadata || typeof metadata !== 'object') return ''
  const provider = (metadata as { provider?: unknown }).provider
  return typeof provider === 'string' ? provider : ''
}

function extractQuotaRemaining(output: unknown): number | undefined {
  if (!output || typeof output !== 'object') return undefined
  const metadata = (output as { metadata?: unknown }).metadata
  if (!metadata || typeof metadata !== 'object') return undefined
  const value = (metadata as { quotaRemaining?: unknown }).quotaRemaining
  return typeof value === 'number' ? value : undefined
}

function extensionFor(mimeType: string, url: string): string {
  if (mimeType.includes('png')) return '.png'
  if (mimeType.includes('webp')) return '.webp'
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return '.jpg'
  const fromUrl = extname(new URL(url).pathname).toLowerCase()
  return ['.png', '.webp', '.jpg', '.jpeg'].includes(fromUrl) ? fromUrl : '.png'
}

function parseDataUrl(url: string): { bytes: Buffer; mimeType: string } | null {
  const match = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(url)
  if (!match) return null
  const mimeType = match[1] || 'image/png'
  const raw = match[3] || ''
  const bytes = match[2] ? Buffer.from(raw, 'base64') : Buffer.from(decodeURIComponent(raw), 'utf8')
  return { bytes, mimeType }
}

async function saveCandidateLocally(input: {
  bookId: number
  skillId: string
  runId: string
  index: number
  candidate: VisualCandidate
}): Promise<VisualCandidate> {
  try {
    let bytes: Buffer
    let mimeType = ''
    const dataUrl = parseDataUrl(input.candidate.url)
    if (dataUrl) {
      bytes = dataUrl.bytes
      mimeType = dataUrl.mimeType
    } else {
      const response = await fetch(input.candidate.url)
      if (!response.ok) throw new Error(`download failed (${response.status})`)
      const arrayBuffer = await response.arrayBuffer()
      bytes = Buffer.from(arrayBuffer)
      mimeType = response.headers.get('content-type') || ''
    }

    const sha256 = createHash('sha256').update(bytes).digest('hex')
    const dir = join(app.getPath('userData'), 'visual-assets', `book-${input.bookId}`)
    await mkdir(dir, { recursive: true })
    const runPart = input.runId || `local-${Date.now()}`
    const skillPart = input.skillId.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')
    const localPath = join(dir, `${runPart}-${skillPart}-${input.index + 1}-${sha256.slice(0, 12)}${extensionFor(mimeType, input.candidate.url)}`)
    await writeFile(localPath, bytes)

    return {
      ...input.candidate,
      localPath,
      mimeType,
      sha256,
      fileSize: bytes.byteLength
    }
  } catch (error) {
    return {
      ...input.candidate,
      localSaveError: error instanceof Error ? error.message : String(error)
    }
  }
}

export async function generateVisualAssets(
  input: VisualGenerateInput,
  token: string | null
): Promise<VisualGenerateResult> {
  const result = await executeOfficialSkill(input.skillId, input.input, token, {
    modelHint: input.modelHint
  })
  if (result.error) {
    return { error: result.error, code: result.code, assets: [] }
  }

  const candidates = extractCandidates(result.output)
  const localCandidates = await Promise.all(
    candidates.map((candidate, index) =>
      saveCandidateLocally({
        bookId: input.bookId,
        skillId: input.skillId,
        runId: result.runId || '',
        index,
        candidate
      })
    )
  )
  const assets = localCandidates.length > 0
    ? insertVisualAssets({
        bookId: input.bookId,
        skillId: input.skillId,
        remoteRunId: result.runId || '',
        provider: extractProvider(result.output),
        candidates: localCandidates
      })
    : []

  return {
    runId: result.runId,
    output: result.output,
    assets,
    quotaRemaining: extractQuotaRemaining(result.output)
  }
}

export function getVisualAssets(bookId: number): VisualAsset[] {
  return listVisualAssets(bookId)
}
