import { describe, expect, it } from 'vitest'
import { decideWorkspaceEntry } from '../workspace-entry'

describe('decideWorkspaceEntry', () => {
  it('shows onboarding first and skips overview when onboarding has not completed', () => {
    expect(
      decideWorkspaceEntry({
        onboardingDone: false,
        pendingOnboarding: true,
        overviewShownInSession: false
      })
    ).toEqual({
      showOnboarding: true,
      markOnboardingDone: true,
      clearPendingOnboarding: true,
      showOverview: false,
      markOverviewShown: false
    })
  })

  it('shows overview after onboarding is already done and session overview has not been shown', () => {
    expect(
      decideWorkspaceEntry({
        onboardingDone: true,
        pendingOnboarding: false,
        overviewShownInSession: false
      })
    ).toEqual({
      showOnboarding: false,
      markOnboardingDone: false,
      clearPendingOnboarding: false,
      showOverview: true,
      markOverviewShown: true
    })
  })

  it('does nothing once onboarding is done and overview has already been shown in this session', () => {
    expect(
      decideWorkspaceEntry({
        onboardingDone: true,
        pendingOnboarding: false,
        overviewShownInSession: true
      })
    ).toEqual({
      showOnboarding: false,
      markOnboardingDone: false,
      clearPendingOnboarding: false,
      showOverview: false,
      markOverviewShown: false
    })
  })
})
