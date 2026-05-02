import { getDb } from './connection'
import type {
  AiDeconstructionReport,
  AiDeconstructionReportSummary,
  AiDeconstructionSourceType,
  CreateAiDeconstructionReportInput
} from '../../shared/deconstruction-report'

interface ReportRow {
  id: number
  book_id: number
  work_title: string
  source_type: AiDeconstructionSourceType
  source_note: string
  input_hash: string
  focus: string
  run_id: string
  output_json: string
  evidence_json: string
  created_at: string
  updated_at: string
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function toSummary(row: ReportRow): AiDeconstructionReportSummary {
  return {
    id: row.id,
    book_id: row.book_id,
    work_title: row.work_title,
    source_type: row.source_type,
    source_note: row.source_note,
    input_hash: row.input_hash,
    focus: parseJson<string[]>(row.focus, []),
    run_id: row.run_id,
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

function toReport(row: ReportRow): AiDeconstructionReport {
  return {
    ...toSummary(row),
    output: parseJson<unknown>(row.output_json, {}),
    evidence: parseJson<unknown[]>(row.evidence_json, [])
  }
}

function normalizeSourceType(value: string): AiDeconstructionSourceType {
  return value === 'authorized_export' ? 'authorized_export' : 'manual'
}

export function createDeconstructionReport(input: CreateAiDeconstructionReportInput): AiDeconstructionReport {
  const db = getDb()
  const sourceType = normalizeSourceType(input.source_type)
  const result = db
    .prepare(
      `INSERT INTO ai_deconstruction_reports (
        book_id, work_title, source_type, source_note, input_hash, focus, run_id, output_json, evidence_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.book_id,
      input.work_title.trim(),
      sourceType,
      input.source_note.trim(),
      input.input_hash.trim(),
      JSON.stringify(input.focus.filter((item) => typeof item === 'string')),
      input.run_id.trim(),
      JSON.stringify(input.output ?? {}),
      JSON.stringify(Array.isArray(input.evidence) ? input.evidence : [])
    )

  return getDeconstructionReport(Number(result.lastInsertRowid)) as AiDeconstructionReport
}

export function listDeconstructionReports(bookId: number): AiDeconstructionReportSummary[] {
  const rows = getDb()
    .prepare(
      `SELECT *
       FROM ai_deconstruction_reports
       WHERE book_id = ?
       ORDER BY created_at DESC, id DESC`
    )
    .all(bookId) as ReportRow[]
  return rows.map(toSummary)
}

export function getDeconstructionReport(id: number): AiDeconstructionReport | null {
  const row = getDb().prepare('SELECT * FROM ai_deconstruction_reports WHERE id = ?').get(id) as ReportRow | undefined
  return row ? toReport(row) : null
}

export function deleteDeconstructionReport(id: number): boolean {
  const result = getDb().prepare('DELETE FROM ai_deconstruction_reports WHERE id = ?').run(id)
  return result.changes > 0
}

