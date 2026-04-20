import { describe, expect, it } from 'vitest'
import { applyForeshadowStatusChange, shouldAutoEscalateForeshadow } from '../foreshadow-status'

describe('shouldAutoEscalateForeshadow', () => {
  it('skips auto escalation after a manual rollback back to pending', () => {
    expect(
      shouldAutoEscalateForeshadow({
        status: 'pending',
        auto_suppressed: 1
      })
    ).toBe(false)
  })

  it('still auto escalates a normal pending foreshadow', () => {
    expect(
      shouldAutoEscalateForeshadow({
        status: 'pending',
        auto_suppressed: 0
      })
    ).toBe(true)
  })
})

describe('applyForeshadowStatusChange', () => {
  it('marks warning -> pending rollback as auto-suppressed', () => {
    expect(
      applyForeshadowStatusChange({
        currentStatus: 'warning',
        nextStatus: 'pending'
      })
    ).toEqual({
      status: 'pending',
      auto_suppressed: 1
    })
  })

  it('clears suppression when moving forward again', () => {
    expect(
      applyForeshadowStatusChange({
        currentStatus: 'pending',
        nextStatus: 'warning'
      })
    ).toEqual({
      status: 'warning',
      auto_suppressed: 0
    })
  })
})
