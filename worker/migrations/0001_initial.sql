PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS dataset_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT '',
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  territory TEXT NOT NULL,
  checked_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS dataset_snapshots_lookup ON dataset_snapshots(kind, country_code, updated_at DESC);

CREATE TABLE IF NOT EXISTS current_datasets (
  kind TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT '',
  snapshot_id TEXT NOT NULL REFERENCES dataset_snapshots(snapshot_id),
  PRIMARY KEY(kind, country_code)
);

CREATE TABLE IF NOT EXISTS update_runs (
  run_id TEXT PRIMARY KEY,
  task TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT '',
  trigger_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('running', 'published', 'failed', 'skipped')),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  record_count INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS update_runs_recent ON update_runs(started_at DESC);

CREATE TABLE IF NOT EXISTS review_queue (
  item_id TEXT PRIMARY KEY,
  item_kind TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  territory TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  reasons_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  created_at TEXT NOT NULL,
  reviewed_at TEXT,
  reviewer TEXT
);

CREATE INDEX IF NOT EXISTS review_queue_pending ON review_queue(status, created_at DESC);

CREATE TABLE IF NOT EXISTS canonical_films (
  film_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  release_year INTEGER NOT NULL,
  territory TEXT NOT NULL,
  primary_source_name TEXT NOT NULL,
  primary_source_url TEXT NOT NULL,
  checked_at TEXT NOT NULL,
  horror_verified INTEGER NOT NULL DEFAULT 0 CHECK(horror_verified IN (0, 1)),
  horror_source_url TEXT,
  tmdb_id INTEGER,
  watchmode_id INTEGER,
  movieglu_id INTEGER,
  release_mode TEXT NOT NULL DEFAULT 'unconfirmed' CHECK(release_mode IN ('streaming-first', 'direct-to-video', 'theatrical-then-streaming', 'unconfirmed')),
  release_mode_source_url TEXT,
  editorial_status TEXT NOT NULL DEFAULT 'pending' CHECK(editorial_status IN ('pending', 'approved', 'rejected')),
  UNIQUE(tmdb_id), UNIQUE(watchmode_id), UNIQUE(movieglu_id)
);

CREATE TABLE IF NOT EXISTS critic_reviews (
  review_id TEXT PRIMARY KEY,
  film_id TEXT NOT NULL,
  release_year INTEGER NOT NULL,
  critic_id TEXT NOT NULL,
  critic_name TEXT NOT NULL,
  publication TEXT NOT NULL,
  publication_url TEXT NOT NULL,
  review_url TEXT NOT NULL,
  canonical_review_key TEXT NOT NULL UNIQUE,
  score REAL NOT NULL,
  score_out_of REAL NOT NULL,
  territory TEXT NOT NULL,
  published_at TEXT NOT NULL,
  checked_at TEXT NOT NULL,
  permission_cleared INTEGER NOT NULL CHECK(permission_cleared IN (0, 1)),
  permission_evidence_url TEXT NOT NULL,
  professional_verified INTEGER NOT NULL CHECK(professional_verified IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  source_method TEXT NOT NULL DEFAULT 'manual-editorial',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(film_id, release_year, critic_id)
);

CREATE INDEX IF NOT EXISTS critic_reviews_ranking ON critic_reviews(release_year, film_id, status);

CREATE TABLE IF NOT EXISTS rank_history (
  release_year INTEGER NOT NULL,
  film_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  average_score REAL NOT NULL,
  critic_count INTEGER NOT NULL,
  ranked_at TEXT NOT NULL,
  PRIMARY KEY(release_year, film_id, ranked_at)
);

CREATE INDEX IF NOT EXISTS rank_history_latest ON rank_history(release_year, ranked_at DESC, position);
