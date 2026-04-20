import type Database from 'better-sqlite3'

export function createSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT '',
      cover_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS project_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL UNIQUE,
      genre TEXT NOT NULL DEFAULT 'urban',
      character_fields TEXT NOT NULL DEFAULT '[]',
      faction_labels TEXT NOT NULL DEFAULT '[]',
      status_labels TEXT NOT NULL DEFAULT '[]',
      emotion_labels TEXT NOT NULL DEFAULT '[]',
      daily_goal INTEGER NOT NULL DEFAULT 6000,
      sensitive_list TEXT NOT NULL DEFAULT 'default',
      ai_api_key TEXT NOT NULL DEFAULT '',
      ai_api_endpoint TEXT NOT NULL DEFAULT '',
      ai_model TEXT NOT NULL DEFAULT '',
      ai_provider TEXT NOT NULL DEFAULT 'openai',
      editor_font TEXT NOT NULL DEFAULT 'serif',
      editor_font_size INTEGER NOT NULL DEFAULT 19,
      editor_line_height REAL NOT NULL DEFAULT 2.2,
      editor_width TEXT NOT NULL DEFAULT 'standard',
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS volumes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chapters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      volume_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      word_count INTEGER NOT NULL DEFAULT 0,
      summary TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (volume_id) REFERENCES volumes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS characters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      faction TEXT NOT NULL DEFAULT 'neutral',
      status TEXT NOT NULL DEFAULT 'active',
      custom_fields TEXT NOT NULL DEFAULT '{}',
      description TEXT NOT NULL DEFAULT '',
      avatar_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS character_appearances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL,
      chapter_id INTEGER NOT NULL,
      UNIQUE(character_id, chapter_id),
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    );

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

    CREATE TABLE IF NOT EXISTS plotlines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#10b981',
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS plot_nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      chapter_number INTEGER NOT NULL DEFAULT 0,
      title TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0 CHECK(score BETWEEN -5 AND 5),
      node_type TEXT NOT NULL DEFAULT 'main',
      description TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      plotline_id INTEGER DEFAULT NULL REFERENCES plotlines(id) ON DELETE SET NULL,
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

    CREATE TABLE IF NOT EXISTS foreshadowings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      chapter_id INTEGER,
      text TEXT NOT NULL,
      expected_chapter INTEGER,
      expected_word_count INTEGER,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','warning','resolved')),
      auto_suppressed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS settings_wiki (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      category TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chapter_id INTEGER NOT NULL,
      content TEXT,
      word_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS daily_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      word_count INTEGER NOT NULL DEFAULT 0,
      UNIQUE(book_id, date),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );

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

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chapter_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER,
      name TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      is_builtin INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS custom_shortcuts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL UNIQUE,
      keys TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS annotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chapter_id INTEGER NOT NULL,
      text_anchor TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS chapters_fts USING fts5(title, content, content='chapters', content_rowid='id');

    CREATE TRIGGER IF NOT EXISTS chapters_ai AFTER INSERT ON chapters BEGIN
      INSERT INTO chapters_fts(rowid, title, content) VALUES (new.id, COALESCE(new.title, ''), COALESCE(new.content, ''));
    END;

    CREATE TRIGGER IF NOT EXISTS chapters_ad AFTER DELETE ON chapters BEGIN
      INSERT INTO chapters_fts(chapters_fts, rowid, title, content) VALUES('delete', old.id, COALESCE(old.title, ''), COALESCE(old.content, ''));
    END;

    CREATE TRIGGER IF NOT EXISTS chapters_au AFTER UPDATE ON chapters BEGIN
      INSERT INTO chapters_fts(chapters_fts, rowid, title, content) VALUES('delete', old.id, COALESCE(old.title, ''), COALESCE(old.content, ''));
      INSERT INTO chapters_fts(rowid, title, content) VALUES (new.id, COALESCE(new.title, ''), COALESCE(new.content, ''));
    END;
  `)
}
