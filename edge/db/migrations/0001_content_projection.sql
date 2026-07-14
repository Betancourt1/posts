PRAGMA foreign_keys = ON;

CREATE TABLE sync_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  delivery_id TEXT UNIQUE,
  commit_sha TEXT,
  trigger TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  error TEXT
);

CREATE TABLE sources (
  path TEXT PRIMARY KEY,
  blob_sha TEXT NOT NULL,
  commit_sha TEXT,
  source_lang TEXT NOT NULL CHECK (source_lang IN ('en', 'es')),
  raw_markdown TEXT NOT NULL,
  frontmatter_json TEXT NOT NULL,
  projector_version TEXT NOT NULL,
  last_seen_run_id INTEGER REFERENCES sync_runs(id)
);

CREATE TABLE source_revisions (
  path TEXT NOT NULL REFERENCES sources(path) ON DELETE CASCADE,
  blob_sha TEXT NOT NULL,
  commit_sha TEXT,
  first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (path, blob_sha)
);

CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_key TEXT NOT NULL UNIQUE,
  source_path TEXT NOT NULL REFERENCES sources(path) ON DELETE CASCADE,
  lang TEXT NOT NULL CHECK (lang IN ('en', 'es')),
  kind TEXT NOT NULL CHECK (kind IN ('home', 'section', 'page')),
  section TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  date TEXT,
  summary TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  translation_key TEXT,
  body_markdown TEXT NOT NULL DEFAULT '',
  body_text TEXT NOT NULL DEFAULT '',
  body_html TEXT NOT NULL DEFAULT '',
  frontmatter_json TEXT NOT NULL,
  draft INTEGER NOT NULL DEFAULT 0 CHECK (draft IN (0, 1)),
  hidden INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0, 1)),
  searchable INTEGER NOT NULL DEFAULT 0 CHECK (searchable IN (0, 1)),
  tags_text TEXT NOT NULL DEFAULT '',
  generated INTEGER NOT NULL DEFAULT 0 CHECK (generated IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX documents_language_section_date
  ON documents(lang, section, date DESC);
CREATE INDEX documents_visibility
  ON documents(lang, draft, hidden, searchable);
CREATE INDEX documents_translation
  ON documents(translation_key, lang);

CREATE TABLE routes (
  path TEXT PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('canonical', 'alias'))
);

CREATE INDEX routes_document ON routes(document_id);

CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lang TEXT NOT NULL CHECK (lang IN ('en', 'es')),
  label TEXT NOT NULL,
  slug TEXT NOT NULL,
  UNIQUE (lang, slug)
);

CREATE TABLE document_tags (
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  PRIMARY KEY (document_id, tag_id)
);

CREATE INDEX document_tags_tag ON document_tags(tag_id, document_id);

CREATE TABLE links (
  source_document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  ordinal INTEGER NOT NULL,
  target_path TEXT,
  target_document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
  href TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  external INTEGER NOT NULL DEFAULT 0 CHECK (external IN (0, 1)),
  PRIMARY KEY (source_document_id, ordinal)
);

CREATE INDEX links_target ON links(target_document_id);

CREATE VIRTUAL TABLE documents_fts USING fts5(
  title,
  summary,
  body_text,
  tags_text,
  content='documents',
  content_rowid='id',
  tokenize='unicode61 remove_diacritics 2'
);

CREATE TRIGGER documents_fts_insert AFTER INSERT ON documents
WHEN new.searchable = 1
BEGIN
  INSERT INTO documents_fts(rowid, title, summary, body_text, tags_text)
  VALUES (new.id, new.title, new.summary, new.body_text, new.tags_text);
END;

CREATE TRIGGER documents_fts_delete AFTER DELETE ON documents
WHEN old.searchable = 1
BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, title, summary, body_text, tags_text)
  VALUES ('delete', old.id, old.title, old.summary, old.body_text, old.tags_text);
END;

CREATE TRIGGER documents_fts_update AFTER UPDATE ON documents
BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, title, summary, body_text, tags_text)
  SELECT 'delete', old.id, old.title, old.summary, old.body_text, old.tags_text
  WHERE old.searchable = 1;

  INSERT INTO documents_fts(rowid, title, summary, body_text, tags_text)
  SELECT new.id, new.title, new.summary, new.body_text, new.tags_text
  WHERE new.searchable = 1;
END;
