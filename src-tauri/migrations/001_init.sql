-- 001_init: initial schema (docs/DESIGN_SPEC.md §5).

CREATE TABLE folders (
  id          TEXT PRIMARY KEY,           -- uuidv7
  parent_id   TEXT REFERENCES folders(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  REAL NOT NULL DEFAULT 0,    -- fractional indexing for drag-reorder
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  deleted_at  INTEGER
);
CREATE INDEX folders_parent_id ON folders(parent_id);

CREATE TABLE documents (
  id          TEXT PRIMARY KEY,
  folder_id   TEXT REFERENCES folders(id) ON DELETE SET NULL,
  title       TEXT NOT NULL DEFAULT 'Untitled',
  content     TEXT NOT NULL,              -- Tiptap JSON
  plain_text  TEXT NOT NULL DEFAULT '',   -- for search + export
  word_count  INTEGER NOT NULL DEFAULT 0,
  pinned      INTEGER NOT NULL DEFAULT 0,
  sort_order  REAL NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  deleted_at  INTEGER                     -- trash; purge after 30 days
);
CREATE INDEX documents_folder_id ON documents(folder_id);

CREATE VIRTUAL TABLE documents_fts USING fts5(
  title, plain_text, content='documents', content_rowid='rowid'
);

-- Keep documents_fts in sync with documents.
CREATE TRIGGER documents_fts_insert AFTER INSERT ON documents BEGIN
  INSERT INTO documents_fts(rowid, title, plain_text)
  VALUES (new.rowid, new.title, new.plain_text);
END;

CREATE TRIGGER documents_fts_delete AFTER DELETE ON documents BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, title, plain_text)
  VALUES ('delete', old.rowid, old.title, old.plain_text);
END;

CREATE TRIGGER documents_fts_update AFTER UPDATE OF title, plain_text ON documents BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, title, plain_text)
  VALUES ('delete', old.rowid, old.title, old.plain_text);
  INSERT INTO documents_fts(rowid, title, plain_text)
  VALUES (new.rowid, new.title, new.plain_text);
END;

CREATE TABLE sessions (
  id             TEXT PRIMARY KEY,
  local_date     TEXT NOT NULL,           -- 'YYYY-MM-DD' in local tz at session start
  started_at     INTEGER NOT NULL,        -- UTC ms
  ended_at       INTEGER,                 -- null while active
  active_ms      INTEGER NOT NULL DEFAULT 0,
  words          INTEGER NOT NULL DEFAULT 0  -- sum of session_docs net words (denormalized)
);
CREATE INDEX sessions_local_date ON sessions(local_date);

CREATE TABLE session_docs (
  session_id   TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  document_id  TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  start_words  INTEGER NOT NULL,
  end_words    INTEGER NOT NULL,
  PRIMARY KEY (session_id, document_id)
);

CREATE TABLE weeks (
  week_start     TEXT PRIMARY KEY,        -- 'YYYY-MM-DD' local date of first day
  week_starts_on INTEGER NOT NULL,        -- 0=Sun,1=Mon at time of creation
  goal_words     INTEGER NOT NULL,        -- goal snapshot for this week
  daily_target   INTEGER                  -- null = no daily target
);

CREATE TABLE achievements (
  id          TEXT PRIMARY KEY,           -- e.g. 'words_10k', 'streak_10'
  unlocked_at INTEGER NOT NULL
);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL                     -- JSON
);
