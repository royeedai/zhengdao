export type VisualSkillId =
  | 'layer2.visual.cover-gen'
  | 'layer2.visual.character-portrait'
  | 'layer2.visual.scene-illustration'

export type VisualAsset = {
  id: number
  book_id: number
  skill_id: VisualSkillId
  remote_run_id: string
  provider: string
  url: string
  local_path: string
  mime_type: string
  sha256: string
  file_size: number
  prompt_used: string
  width: number
  height: number
  status: 'created' | 'failed'
  metadata: Record<string, unknown>
  created_at: string
}

export type VisualGenerateInput = {
  bookId: number
  skillId: VisualSkillId
  input: Record<string, unknown>
  modelHint?: 'fast' | 'balanced' | 'heavy'
}

export type VisualGenerateResult = {
  runId?: string
  output?: unknown
  assets: VisualAsset[]
  error?: string
  code?: string
  quotaRemaining?: number
}
