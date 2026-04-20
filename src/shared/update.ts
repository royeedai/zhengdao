export type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'ready' | 'error'

export interface UpdateSnapshot {
  status: UpdateStatus
  version: string | null
  downloadPercent: number
  releaseDate: string | null
  releaseNotesSummary: string | null
  errorMessage: string | null
}

export type UpdateEvent =
  | { type: 'checking' }
  | { type: 'update-available'; payload?: UpdateMetadata | null }
  | { type: 'download-progress'; downloadPercent: number }
  | { type: 'update-downloaded'; payload?: UpdateMetadata | null }
  | { type: 'update-not-available' }
  | { type: 'error'; errorMessage: string }

export interface UpdateMetadata {
  version?: string | null
  releaseDate?: string | Date | null
  releaseNotes?: unknown
}

export function createIdleUpdateSnapshot(): UpdateSnapshot {
  return {
    status: 'idle',
    version: null,
    downloadPercent: 0,
    releaseDate: null,
    releaseNotesSummary: null,
    errorMessage: null
  }
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

function normalizeReleaseDate(value: string | Date | null | undefined): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  return value
}

export function summarizeReleaseNotes(releaseNotes: unknown): string | null {
  if (typeof releaseNotes === 'string') {
    const trimmed = releaseNotes.trim()
    return trimmed ? trimmed : null
  }

  if (Array.isArray(releaseNotes)) {
    const text = releaseNotes
      .map((entry) => {
        if (typeof entry === 'string') return entry.trim()
        if (entry && typeof entry === 'object' && 'note' in entry) {
          const note = (entry as { note?: unknown }).note
          return typeof note === 'string' ? note.trim() : ''
        }
        return ''
      })
      .filter(Boolean)
      .join('\n')
      .trim()
    return text || null
  }

  return null
}

function applyMetadata(snapshot: UpdateSnapshot, payload?: UpdateMetadata | null): UpdateSnapshot {
  if (!payload) return snapshot
  return {
    ...snapshot,
    version: payload.version ?? snapshot.version,
    releaseDate: normalizeReleaseDate(payload.releaseDate) ?? snapshot.releaseDate,
    releaseNotesSummary: summarizeReleaseNotes(payload.releaseNotes) ?? snapshot.releaseNotesSummary
  }
}

export function reduceUpdateSnapshot(current: UpdateSnapshot, event: UpdateEvent): UpdateSnapshot {
  switch (event.type) {
    case 'checking':
      return {
        ...current,
        status: 'checking',
        errorMessage: null
      }
    case 'update-available':
      return applyMetadata(
        {
          ...current,
          status: 'downloading',
          downloadPercent: 0,
          errorMessage: null
        },
        event.payload
      )
    case 'download-progress':
      return {
        ...current,
        status: 'downloading',
        downloadPercent: clampPercent(event.downloadPercent),
        errorMessage: null
      }
    case 'update-downloaded':
      return applyMetadata(
        {
          ...current,
          status: 'ready',
          downloadPercent: 100,
          errorMessage: null
        },
        event.payload
      )
    case 'update-not-available':
      return createIdleUpdateSnapshot()
    case 'error':
      return {
        ...createIdleUpdateSnapshot(),
        status: 'error',
        errorMessage: event.errorMessage
      }
  }
}

export function shouldShowReadyToInstall(snapshot: UpdateSnapshot): boolean {
  return snapshot.status === 'ready' && Boolean(snapshot.version)
}
