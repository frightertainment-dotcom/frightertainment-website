-- FrightNews persistent headline index (metadata only, never copied full articles).
-- Archive rows are kept permanently. Every 500 active rows, oldest 400 are
-- marked archived, leaving the newest 100 on the active news index.
CREATE TABLE IF NOT EXISTS frightnews_articles (
  url TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  category TEXT NOT NULL,
  source TEXT NOT NULL,
  published_at TEXT NOT NULL,
  discovered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  archived_at TEXT
);
CREATE INDEX IF NOT EXISTS frightnews_active_date ON frightnews_articles(archived_at, published_at DESC, url);
CREATE TABLE IF NOT EXISTS frightnews_sync_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_attempt_at TEXT,
  last_success_at TEXT,
  last_source_count INTEGER NOT NULL DEFAULT 0,
  last_article_count INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO frightnews_sync_state (id) VALUES (1);
