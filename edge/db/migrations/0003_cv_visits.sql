-- Only the operator registers IDs; no company/vacancy mapping belongs here.
CREATE TABLE cv_attributions (
  cv_id TEXT PRIMARY KEY NOT NULL
    CHECK (length(cv_id) BETWEEN 16 AND 64 AND cv_id NOT GLOB '*[^A-Za-z0-9_-]*'),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  expires_at INTEGER NOT NULL DEFAULT (unixepoch() + 15552000)
);

-- A visit is a received page-load event, not a unique or verified human.
CREATE TABLE cv_visit_events (
  id INTEGER PRIMARY KEY,
  cv_id TEXT NOT NULL REFERENCES cv_attributions(cv_id) ON DELETE CASCADE,
  visited_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX cv_visit_events_attribution_time ON cv_visit_events(cv_id, visited_at);
