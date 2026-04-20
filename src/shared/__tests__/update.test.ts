import { describe, expect, it } from 'vitest'
import { createIdleUpdateSnapshot, reduceUpdateSnapshot } from '../update'

describe('reduceUpdateSnapshot', () => {
  it('transitions from checking to downloading to ready with release info', () => {
    const checking = reduceUpdateSnapshot(createIdleUpdateSnapshot(), { type: 'checking' })
    const downloading = reduceUpdateSnapshot(checking, {
      type: 'update-available',
      payload: {
        version: '1.2.3',
        releaseDate: '2026-04-20T12:00:00.000Z',
        releaseNotes: '修复在线更新'
      }
    })
    const ready = reduceUpdateSnapshot(downloading, {
      type: 'update-downloaded',
      payload: {
        version: '1.2.3',
        releaseDate: '2026-04-20T12:00:00.000Z',
        releaseNotes: '修复在线更新'
      }
    })

    expect(checking).toMatchObject({ status: 'checking' })
    expect(downloading).toMatchObject({
      status: 'downloading',
      version: '1.2.3',
      releaseDate: '2026-04-20T12:00:00.000Z',
      releaseNotesSummary: '修复在线更新'
    })
    expect(ready).toMatchObject({
      status: 'ready',
      version: '1.2.3',
      releaseDate: '2026-04-20T12:00:00.000Z',
      releaseNotesSummary: '修复在线更新'
    })
  })

  it('returns to idle when no update is available and moves to error on failures', () => {
    const checking = reduceUpdateSnapshot(createIdleUpdateSnapshot(), { type: 'checking' })
    const idle = reduceUpdateSnapshot(checking, { type: 'update-not-available' })
    const errored = reduceUpdateSnapshot(checking, {
      type: 'error',
      errorMessage: 'network down'
    })

    expect(idle).toEqual(createIdleUpdateSnapshot())
    expect(errored).toMatchObject({
      status: 'error',
      errorMessage: 'network down'
    })
  })
})
