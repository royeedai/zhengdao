import { EventEmitter } from 'node:events'
import { describe, expect, it } from 'vitest'
import { UpdaterController } from '../updater-controller'

class FakeUpdater extends EventEmitter {
  autoDownload = false
  autoInstallOnAppQuit = true
  checkCalls = 0
  quitCalls = 0

  async checkForUpdates() {
    this.checkCalls += 1
  }

  quitAndInstall() {
    this.quitCalls += 1
  }
}

describe('UpdaterController', () => {
  it('broadcasts a ready snapshot after the update has been downloaded', () => {
    const updater = new FakeUpdater()
    const seen: Array<{ status: string; version: string | null }> = []
    const controller = new UpdaterController(updater, (snapshot) => {
      seen.push({ status: snapshot.status, version: snapshot.version })
    })

    controller.bind()
    updater.emit('update-downloaded', {
      version: '1.2.3',
      releaseDate: '2026-04-20T12:00:00.000Z',
      releaseNotes: '修复在线更新'
    })

    expect(controller.getSnapshot()).toMatchObject({
      status: 'ready',
      version: '1.2.3'
    })
    expect(seen[seen.length - 1]).toEqual({
      status: 'ready',
      version: '1.2.3'
    })
  })

  it('rejects install requests until an update is ready', () => {
    const updater = new FakeUpdater()
    const controller = new UpdaterController(updater)

    controller.bind()

    expect(() => controller.installDownloadedUpdate()).toThrow(/not ready/i)
    expect(updater.quitCalls).toBe(0)
  })
})
