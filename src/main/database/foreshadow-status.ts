export type ForeshadowStatus = 'pending' | 'warning' | 'resolved'

export interface ForeshadowStatusRow {
  status: ForeshadowStatus
  auto_suppressed?: number | null
}

export interface ForeshadowStatusChangeInput {
  currentStatus: ForeshadowStatus
  nextStatus: ForeshadowStatus
  currentAutoSuppressed?: number | null
}

export function shouldAutoEscalateForeshadow(row: ForeshadowStatusRow): boolean {
  return row.status === 'pending' && Number(row.auto_suppressed ?? 0) === 0
}

export function applyForeshadowStatusChange(input: ForeshadowStatusChangeInput): ForeshadowStatusRow {
  if (input.nextStatus === input.currentStatus) {
    return {
      status: input.nextStatus,
      auto_suppressed: Number(input.currentAutoSuppressed ?? 0)
    }
  }

  if (input.currentStatus === 'warning' && input.nextStatus === 'pending') {
    return {
      status: 'pending',
      auto_suppressed: 1
    }
  }

  return {
    status: input.nextStatus,
    auto_suppressed: 0
  }
}
