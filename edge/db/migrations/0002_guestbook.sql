PRAGMA foreign_keys = ON;

CREATE TABLE guestbook_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  site TEXT,
  message TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX guestbook_entries_recent ON guestbook_entries(created_at DESC);
CREATE INDEX guestbook_entries_rate ON guestbook_entries(ip_hash, created_at);
