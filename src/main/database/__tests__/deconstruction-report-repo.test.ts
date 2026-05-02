import BetterSqlite3 from 'better-sqlite3'
import type Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSchema } from '../schema'

const state = vi.hoisted(() => ({
  db: null as Database.Database | null
}))

vi.mock('../connection', () => ({
  getDb: () => {
    if (!state.db) throw new Error('test db not initialized')
    return state.db
  }
}))

import {
  createDeconstructionReport,
  deleteDeconstructionReport,
  getDeconstructionReport,
  listDeconstructionReports
} from '../deconstruction-report-repo'

describe('deconstruction report repository', () => {
  beforeEach(() => {
    state.db = new BetterSqlite3(':memory:') as Database.Database
    createSchema(state.db)
    state.db.prepare("INSERT INTO books (id, title, author) VALUES (1, '测试书', '')").run()
  })

  afterEach(() => {
    state.db?.close()
    state.db = null
  })

  it('stores structured deconstruction output without raw chapter input columns', () => {
    const report = createDeconstructionReport({
      book_id: 1,
      work_title: '授权样本',
      source_type: 'authorized_export',
      source_note: '作者授权导出的样章，仅用于本地拆文学习。',
      input_hash: 'hash-001',
      focus: ['hook', 'retention', 'craft'],
      run_id: 'run-001',
      output: { version: 'webnovel-deconstruct.v0.2', craftCards: [{ dimension: 'hook' }] },
      evidence: [{ chapterId: 'c1', quote: '短证据', reason: '开篇钩子' }]
    })

    expect(report.id).toBeGreaterThan(0)
    expect(report.focus).toEqual(['hook', 'retention', 'craft'])
    expect(report.evidence).toEqual([{ chapterId: 'c1', quote: '短证据', reason: '开篇钩子' }])

    const columns = state.db!.prepare('PRAGMA table_info(ai_deconstruction_reports)').all() as { name: string }[]
    expect(columns.map((column) => column.name)).not.toContain('content')
    expect(columns.map((column) => column.name)).not.toContain('chapters')
  })

  it('lists, loads, and deletes reports by local id', () => {
    const first = createDeconstructionReport({
      book_id: 1,
      work_title: '第一份报告',
      source_type: 'manual',
      source_note: '作者本人手动粘贴的样本，可用于本地分析。',
      input_hash: 'hash-a',
      focus: ['character'],
      run_id: 'run-a',
      output: { status: 'complete' },
      evidence: []
    })
    const second = createDeconstructionReport({
      book_id: 1,
      work_title: '第二份报告',
      source_type: 'manual',
      source_note: '作者本人手动粘贴的样本，可用于本地分析。',
      input_hash: 'hash-b',
      focus: ['emotion'],
      run_id: 'run-b',
      output: { status: 'partial' },
      evidence: []
    })

    expect(listDeconstructionReports(1).map((row) => row.id)).toEqual([second.id, first.id])
    expect(getDeconstructionReport(first.id)?.output).toEqual({ status: 'complete' })
    expect(deleteDeconstructionReport(first.id)).toBe(true)
    expect(getDeconstructionReport(first.id)).toBeNull()
  })
})

