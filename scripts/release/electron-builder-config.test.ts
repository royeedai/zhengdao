import { describe, expect, it } from 'vitest'
import config from '../../electron-builder.config'

describe('electron-builder release config', () => {
  it('uses the release workflow controlled native rebuild instead of rebuilding every dependency', () => {
    expect(config.npmRebuild).toBe(false)
  })
})
