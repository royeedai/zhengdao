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
  createCitation,
  deleteCitation,
  getCitation,
  getCitationByKey,
  listCitations,
  updateCitation
} from '../citation-repo'

describe('DI-02 citation repository', () => {
  beforeEach(() => {
    state.db = new BetterSqlite3(':memory:') as Database.Database
    createSchema(state.db)
    state.db.prepare("INSERT INTO books (id, title, author) VALUES (1, '测试论文', '')").run()
    state.db.prepare("INSERT INTO books (id, title, author) VALUES (2, '另一作品', '')").run()
  })

  afterEach(() => {
    state.db?.close()
    state.db = null
  })

  it('creates a journal citation with required fields', () => {
    const row = createCitation(1, {
      citekey: 'zhang2024-mlmodel',
      citation_type: 'journal',
      authors: '张三, 李四',
      title: '基于深度学习的文本生成方法研究',
      year: 2024,
      journal: '计算机学报',
      volume: '47',
      issue: '3',
      pages: '123-145',
      doi: '10.1145/1234567'
    }) as { id: number; citekey: string; year: number | null }
    expect(row.citekey).toBe('zhang2024-mlmodel')
    expect(row.year).toBe(2024)

    const looked = getCitation(row.id) as { citekey: string; doi: string }
    expect(looked.citekey).toBe('zhang2024-mlmodel')
    expect(looked.doi).toBe('10.1145/1234567')
  })

  it('rejects empty citekey', () => {
    expect(() =>
      createCitation(1, { citekey: '   ', citation_type: 'book', authors: 'A', title: 'B' })
    ).toThrow(/citekey/)
  })

  it('rejects unsupported citation_type', () => {
    expect(() =>
      createCitation(1, { citekey: 'x2024', citation_type: 'magazine', authors: 'A', title: 'B' })
    ).toThrow(/类型/)
  })

  it('enforces unique citekey per book but allows the same key across books', () => {
    createCitation(1, { citekey: 'shared', citation_type: 'book', authors: 'A', title: 'B' })
    expect(() =>
      createCitation(1, { citekey: 'shared', citation_type: 'book', authors: 'C', title: 'D' })
    ).toThrow(/已存在/)
    const row2 = createCitation(2, {
      citekey: 'shared',
      citation_type: 'book',
      authors: 'C',
      title: 'D'
    }) as { id: number }
    expect(row2.id).toBeGreaterThan(0)
  })

  it('lists citations sorted by citekey ascending', () => {
    createCitation(1, { citekey: 'b-paper', citation_type: 'book', authors: 'A', title: 'B' })
    createCitation(1, { citekey: 'a-paper', citation_type: 'book', authors: 'A', title: 'A' })
    createCitation(1, { citekey: 'c-paper', citation_type: 'book', authors: 'A', title: 'C' })
    const rows = listCitations(1) as Array<{ citekey: string }>
    expect(rows.map((r) => r.citekey)).toEqual(['a-paper', 'b-paper', 'c-paper'])
  })

  it('updates allowed fields and ignores unknown fields', () => {
    const row = createCitation(1, {
      citekey: 'x',
      citation_type: 'book',
      authors: 'A',
      title: 'B'
    }) as { id: number }
    updateCitation(row.id, {
      title: 'B 修订版',
      year: '2025',
      // unknown field should be ignored, not throw
      malicious_field: '!!!'
    })
    const updated = getCitation(row.id) as { title: string; year: number | null }
    expect(updated.title).toBe('B 修订版')
    expect(updated.year).toBe(2025)
  })

  it('coerces empty year to null on update', () => {
    const row = createCitation(1, {
      citekey: 'x',
      citation_type: 'book',
      authors: 'A',
      title: 'B',
      year: 2020
    }) as { id: number; year: number | null }
    expect(row.year).toBe(2020)
    updateCitation(row.id, { year: '' })
    const updated = getCitation(row.id) as { year: number | null }
    expect(updated.year).toBeNull()
  })

  it('deleteCitation removes the row', () => {
    const row = createCitation(1, {
      citekey: 'x',
      citation_type: 'book',
      authors: 'A',
      title: 'B'
    }) as { id: number }
    deleteCitation(row.id)
    expect(getCitation(row.id)).toBeUndefined()
  })

  it('getCitationByKey returns the matching row or undefined', () => {
    createCitation(1, { citekey: 'qiu2023', citation_type: 'book', authors: 'A', title: 'B' })
    const found = getCitationByKey(1, 'qiu2023') as { authors: string }
    expect(found.authors).toBe('A')
    expect(getCitationByKey(1, 'unknown')).toBeUndefined()
  })
})
