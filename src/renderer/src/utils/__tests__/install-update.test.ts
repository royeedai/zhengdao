import { describe, expect, it, vi } from 'vitest'
import { flushAndInstallUpdate } from '../install-update'

describe('flushAndInstallUpdate', () => {
  it('flushes pending work before installing the downloaded update', async () => {
    const steps: string[] = []

    await flushAndInstallUpdate({
      prepare: async () => {
        steps.push('prepare')
      },
      install: async () => {
        steps.push('install')
      }
    })

    expect(steps).toEqual(['prepare', 'install'])
  })

  it('does not start installation when the flush step fails', async () => {
    const install = vi.fn()

    await expect(
      flushAndInstallUpdate({
        prepare: async () => {
          throw new Error('save failed')
        },
        install
      })
    ).rejects.toThrow('save failed')

    expect(install).not.toHaveBeenCalled()
  })
})
