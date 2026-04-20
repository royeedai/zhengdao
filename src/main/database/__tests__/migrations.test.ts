import BetterSqlite3 from 'better-sqlite3'
import type Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { runMigrations } from '../migrations'
import { createSchema } from '../schema'

describe('runMigrations', () => {
  it('does not re-add editor columns already present in fresh schema', () => {
    const db = new BetterSqlite3(':memory:') as Database.Database

    try {
      createSchema(db)

      expect(() => runMigrations(db)).not.toThrow()

      const projectConfigColumns = db.prepare('PRAGMA table_info(project_config)').all() as { name: string }[]

      expect(projectConfigColumns.filter((column) => column.name === 'editor_font')).toHaveLength(1)
      expect(projectConfigColumns.filter((column) => column.name === 'editor_font_size')).toHaveLength(1)
      expect(projectConfigColumns.filter((column) => column.name === 'editor_line_height')).toHaveLength(1)
      expect(projectConfigColumns.filter((column) => column.name === 'editor_width')).toHaveLength(1)

      const appliedVersions = db.prepare('SELECT version FROM schema_migrations ORDER BY version').all() as {
        version: number
      }[]

      expect(appliedVersions.map((row) => row.version)).toContain(2)
    } finally {
      db.close()
    }
  })
})
