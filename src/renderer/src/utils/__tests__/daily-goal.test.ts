import { describe, expect, it } from 'vitest'
import { normalizeSystemDailyGoal, resolveProjectDailyGoal } from '../daily-goal'

describe('daily-goal', () => {
  it('normalizes invalid system values back to the fallback', () => {
    expect(normalizeSystemDailyGoal(undefined)).toBe(6000)
    expect(normalizeSystemDailyGoal('abc')).toBe(6000)
    expect(normalizeSystemDailyGoal(0)).toBe(6000)
    expect(normalizeSystemDailyGoal(4321)).toBe(4321)
  })

  it('resolves follow_system and custom project goals correctly', () => {
    expect(
      resolveProjectDailyGoal(
        { daily_goal: 9000, daily_goal_mode: 'follow_system' },
        6000
      )
    ).toBe(6000)

    expect(
      resolveProjectDailyGoal(
        { daily_goal: 9000, daily_goal_mode: 'custom' },
        6000
      )
    ).toBe(9000)
  })
})
