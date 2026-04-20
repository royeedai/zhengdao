import { describe, expect, it } from 'vitest'
import { createIdleUpdateSnapshot } from '../../../../shared/update'
import { shouldShowUpdateButton } from '../update-visibility'

describe('shouldShowUpdateButton', () => {
  it('shows the button only when a downloaded update is ready to install', () => {
    const idle = createIdleUpdateSnapshot()
    const ready = {
      ...createIdleUpdateSnapshot(),
      status: 'ready' as const,
      version: '1.2.3'
    }

    expect(shouldShowUpdateButton(idle, false)).toBe(false)
    expect(shouldShowUpdateButton({ ...idle, status: 'checking' }, false)).toBe(false)
    expect(shouldShowUpdateButton({ ...idle, status: 'downloading', version: '1.2.3' }, false)).toBe(false)
    expect(shouldShowUpdateButton(ready, false)).toBe(true)
  })

  it('keeps the button visible but disabled while install is already in progress', () => {
    const ready = {
      ...createIdleUpdateSnapshot(),
      status: 'ready' as const,
      version: '1.2.3'
    }

    expect(shouldShowUpdateButton(ready, true)).toBe(true)
  })
})
