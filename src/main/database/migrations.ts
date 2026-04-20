import type Database from 'better-sqlite3'

interface Migration {
  version: number
  description: string
  up: (db: Database.Database) => void
}

const migrations: Migration[] = [
  {
    version: 1,
    description: 'Add performance indexes for foreign keys and common queries',
    up: (db) => {
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_volumes_book_id ON volumes(book_id);
        CREATE INDEX IF NOT EXISTS idx_chapters_volume_id ON chapters(volume_id);
        CREATE INDEX IF NOT EXISTS idx_chapters_volume_sort ON chapters(volume_id, sort_order);
        CREATE INDEX IF NOT EXISTS idx_characters_book_id ON characters(book_id);
        CREATE INDEX IF NOT EXISTS idx_character_appearances_chapter ON character_appearances(chapter_id);
        CREATE INDEX IF NOT EXISTS idx_character_appearances_character ON character_appearances(character_id);
        CREATE INDEX IF NOT EXISTS idx_plot_nodes_book_id ON plot_nodes(book_id);
        CREATE INDEX IF NOT EXISTS idx_plot_nodes_book_chapter ON plot_nodes(book_id, chapter_number);
        CREATE INDEX IF NOT EXISTS idx_foreshadowings_book_id ON foreshadowings(book_id);
        CREATE INDEX IF NOT EXISTS idx_foreshadowings_status ON foreshadowings(book_id, status);
        CREATE INDEX IF NOT EXISTS idx_settings_wiki_book ON settings_wiki(book_id, category);
        CREATE INDEX IF NOT EXISTS idx_snapshots_chapter ON snapshots(chapter_id);
        CREATE INDEX IF NOT EXISTS idx_snapshots_chapter_created ON snapshots(chapter_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_notes_book_id ON notes(book_id);
      `)
    }
  },
  {
    version: 2,
    description: 'Add editor typography columns to project_config',
    up: (db) => {
      const cols = new Set(
        (db.prepare('PRAGMA table_info(project_config)').all() as { name: string }[]).map((col) => col.name)
      )
      const statements: string[] = []

      if (!cols.has('editor_font')) {
        statements.push(`ALTER TABLE project_config ADD COLUMN editor_font TEXT NOT NULL DEFAULT 'serif'`)
      }
      if (!cols.has('editor_font_size')) {
        statements.push(`ALTER TABLE project_config ADD COLUMN editor_font_size INTEGER NOT NULL DEFAULT 19`)
      }
      if (!cols.has('editor_line_height')) {
        statements.push(`ALTER TABLE project_config ADD COLUMN editor_line_height REAL NOT NULL DEFAULT 2.2`)
      }
      if (!cols.has('editor_width')) {
        statements.push(`ALTER TABLE project_config ADD COLUMN editor_width TEXT NOT NULL DEFAULT 'standard'`)
      }

      if (statements.length === 0) return
      db.exec(statements.join(';\n'))
    }
  },
  {
    version: 3,
    description: 'Add ai_provider to project_config',
    up: (db) => {
      const cols = db.prepare('PRAGMA table_info(project_config)').all() as { name: string }[]
      if (cols.some((c) => c.name === 'ai_provider')) return
      db.exec(`ALTER TABLE project_config ADD COLUMN ai_provider TEXT NOT NULL DEFAULT 'openai'`)
    }
  },
  {
    version: 4,
    description: 'Add chapter summary column',
    up: (db) => {
      const cols = db.prepare('PRAGMA table_info(chapters)').all() as { name: string }[]
      if (cols.some((c) => c.name === 'summary')) return
      db.exec(`ALTER TABLE chapters ADD COLUMN summary TEXT NOT NULL DEFAULT ''`)
    }
  },
  {
    version: 5,
    description: 'Add sync_queue for Drive upload tracking',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS sync_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book_id INTEGER NOT NULL,
          action TEXT NOT NULL DEFAULT 'upload',
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
          FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_sync_queue_book_id ON sync_queue(book_id);
        CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
      `)
    }
  },
  {
    version: 6,
    description: 'Soft-delete columns for chapters, volumes, characters, foreshadowings',
    up: (db) => {
      const addCol = (table: string, col: string) => {
        const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
        if (cols.some((c) => c.name === col)) return
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} TEXT DEFAULT NULL`)
      }
      addCol('chapters', 'deleted_at')
      addCol('volumes', 'deleted_at')
      addCol('characters', 'deleted_at')
      addCol('foreshadowings', 'deleted_at')
    }
  },
  {
    version: 7,
    description: 'Rebuild FTS5 chapter index after schema upgrade',
    up: (db) => {
      const rows = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='chapters_fts'").all() as {
        name: string
      }[]
      if (rows.length === 0) return
      db.exec(`INSERT INTO chapters_fts(chapters_fts) VALUES('rebuild')`)
    }
  },
  {
    version: 8,
    description: 'Add annotations table',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS annotations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chapter_id INTEGER NOT NULL,
          text_anchor TEXT NOT NULL DEFAULT '',
          content TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
          FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
        );
      `)
    }
  },
  {
    version: 9,
    description: 'Character relations, milestones, relation indexes',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS character_relations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book_id INTEGER NOT NULL,
          source_id INTEGER NOT NULL,
          target_id INTEGER NOT NULL,
          relation_type TEXT NOT NULL DEFAULT 'ally',
          label TEXT NOT NULL DEFAULT '',
          UNIQUE(source_id, target_id),
          FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
          FOREIGN KEY (source_id) REFERENCES characters(id) ON DELETE CASCADE,
          FOREIGN KEY (target_id) REFERENCES characters(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS character_milestones (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          character_id INTEGER NOT NULL,
          chapter_number INTEGER NOT NULL,
          label TEXT NOT NULL DEFAULT '',
          value TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
          FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_character_relations_book ON character_relations(book_id);
        CREATE INDEX IF NOT EXISTS idx_character_milestones_character ON character_milestones(character_id);
      `)
    }
  },
  {
    version: 10,
    description: 'Plotlines, plot_node_characters, plot_nodes.plotline_id',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS plotlines (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          color TEXT NOT NULL DEFAULT '#10b981',
          sort_order INTEGER NOT NULL DEFAULT 0,
          FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS plot_node_characters (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          plot_node_id INTEGER NOT NULL,
          character_id INTEGER NOT NULL,
          UNIQUE(plot_node_id, character_id),
          FOREIGN KEY (plot_node_id) REFERENCES plot_nodes(id) ON DELETE CASCADE,
          FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_plotlines_book_id ON plotlines(book_id);
        CREATE INDEX IF NOT EXISTS idx_plot_node_characters_node ON plot_node_characters(plot_node_id);
        CREATE INDEX IF NOT EXISTS idx_plot_node_characters_character ON plot_node_characters(character_id);
      `)
      const cols = db.prepare('PRAGMA table_info(plot_nodes)').all() as { name: string }[]
      if (!cols.some((c) => c.name === 'plotline_id')) {
        db.exec(`
          ALTER TABLE plot_nodes ADD COLUMN plotline_id INTEGER DEFAULT NULL REFERENCES plotlines(id) ON DELETE SET NULL
        `)
      }
    }
  },
  {
    version: 11,
    description: 'Writing sessions and achievements tables',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS writing_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book_id INTEGER NOT NULL,
          started_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
          ended_at TEXT,
          word_count INTEGER NOT NULL DEFAULT 0,
          FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS achievements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          label TEXT NOT NULL,
          unlocked_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
          FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_writing_sessions_book_started ON writing_sessions(book_id, started_at);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_achievements_book_type ON achievements(book_id, type);
      `)
    }
  },
  {
    version: 12,
    description: 'Chapter content templates',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS chapter_templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book_id INTEGER,
          name TEXT NOT NULL,
          content TEXT NOT NULL DEFAULT '',
          is_builtin INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
        );
      `)
    }
  },
  {
    version: 13,
    description: 'Custom keyboard shortcuts table',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS custom_shortcuts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          action TEXT NOT NULL UNIQUE,
          keys TEXT NOT NULL DEFAULT ''
        );
      `)
    }
  },
  {
    version: 14,
    description: 'Add foreshadow auto_suppressed flag',
    up: (db) => {
      const cols = db.prepare('PRAGMA table_info(foreshadowings)').all() as { name: string }[]
      if (cols.some((col) => col.name === 'auto_suppressed')) return
      db.exec(`ALTER TABLE foreshadowings ADD COLUMN auto_suppressed INTEGER NOT NULL DEFAULT 0`)
    }
  }
]

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    )
  `)

  const applied = new Set(
    (db.prepare('SELECT version FROM schema_migrations').all() as { version: number }[]).map((r) => r.version)
  )

  const pending = migrations.filter((m) => !applied.has(m.version)).sort((a, b) => a.version - b.version)

  for (const migration of pending) {
    console.log(`[DB] Running migration v${migration.version}: ${migration.description}`)
    db.transaction(() => {
      migration.up(db)
      db.prepare('INSERT INTO schema_migrations (version, description) VALUES (?, ?)').run(
        migration.version,
        migration.description
      )
    })()
  }
}
