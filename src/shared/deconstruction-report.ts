export type AiDeconstructionSourceType = 'manual' | 'authorized_export'

export interface AiDeconstructionReportSummary {
  id: number
  book_id: number
  work_title: string
  source_type: AiDeconstructionSourceType
  source_note: string
  input_hash: string
  focus: string[]
  run_id: string
  created_at: string
  updated_at: string
}

export interface AiDeconstructionReport extends AiDeconstructionReportSummary {
  output: unknown
  evidence: unknown[]
}

export interface CreateAiDeconstructionReportInput {
  book_id: number
  work_title: string
  source_type: AiDeconstructionSourceType
  source_note: string
  input_hash: string
  focus: string[]
  run_id: string
  output: unknown
  evidence: unknown[]
}

