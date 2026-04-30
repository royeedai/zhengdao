export type TeamRole = 'owner' | 'admin' | 'editor' | 'reviewer' | 'member'
export type TeamInvitationRole = Exclude<TeamRole, 'owner'>

export interface TeamSummary {
  id: string
  name: string
  plan: string
  seatLimit: number
  ownerUserId: string
  myRole?: TeamRole
  joinedAt?: string
  createdAt: string
}

export interface TeamMember {
  userId: string
  role: TeamRole
  joinedAt: string
}

export interface TeamInvitation {
  id: string
  teamId: string
  email: string
  role: TeamInvitationRole
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
  token?: string
  expiresAt: string
  createdAt: string
  acceptedAt: string | null
}

export interface TeamProjectSummary {
  id: string
  name: string
  ownerUserId: string
  updatedAt?: string
  linkedAt?: string
}

export interface ChapterLockMirror {
  teamId: string
  projectId: string
  chapterId: string
  lockedBy: string
  expiresAt: string
}

export interface ChapterReviewMirror {
  id: string
  teamId: string
  projectId: string
  chapterId: string
  submittedBy: string
  status: 'pending' | 'approved' | 'rejected'
  reviewComments?: string
  createdAt: string
  updatedAt: string
  decidedAt?: string | null
}

export interface TeamApiResult<T> {
  ok: boolean
  data?: T
  error?: string
  code?: string
}
