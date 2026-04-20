export interface WorkspaceEntryInput {
  onboardingDone: boolean
  pendingOnboarding: boolean
  overviewShownInSession: boolean
}

export interface WorkspaceEntryDecision {
  showOnboarding: boolean
  markOnboardingDone: boolean
  clearPendingOnboarding: boolean
  showOverview: boolean
  markOverviewShown: boolean
}

export function decideWorkspaceEntry(input: WorkspaceEntryInput): WorkspaceEntryDecision {
  if (!input.onboardingDone && input.pendingOnboarding) {
    return {
      showOnboarding: true,
      markOnboardingDone: true,
      clearPendingOnboarding: true,
      showOverview: false,
      markOverviewShown: false
    }
  }

  if (!input.overviewShownInSession) {
    return {
      showOnboarding: false,
      markOnboardingDone: false,
      clearPendingOnboarding: false,
      showOverview: true,
      markOverviewShown: true
    }
  }

  return {
    showOnboarding: false,
    markOnboardingDone: false,
    clearPendingOnboarding: false,
    showOverview: false,
    markOverviewShown: false
  }
}
