import { describe, expect, it } from 'vitest'
import { buildElectronRebuildArgs } from '../rebuild-electron-native.mjs'

describe('rebuild-electron-native release args', () => {
  it('limits Electron rebuild to better-sqlite3 only', () => {
    const args = buildElectronRebuildArgs({
      rebuildCli: '/repo/node_modules/@electron/rebuild/lib/cli.js',
      electronVersion: '33.4.11',
      arch: 'arm64',
      moduleDir: '/repo'
    })

    expect(args).toContain('--only')
    expect(args).toContain('better-sqlite3')
    expect(args).not.toContain('--which-module')
    expect(args).toEqual([
      '/repo/node_modules/@electron/rebuild/lib/cli.js',
      '--force',
      '--only',
      'better-sqlite3',
      '--version',
      '33.4.11',
      '--arch',
      'arm64',
      '--module-dir',
      '/repo'
    ])
  })
})
