CREATE TABLE IF NOT EXISTS manual_film_versions (
  film_id TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  title TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  approval_status TEXT NOT NULL CHECK(approval_status IN ('approved', 'pending-review')),
  synced_at TEXT NOT NULL,
  PRIMARY KEY(film_id, source_hash)
);

CREATE INDEX IF NOT EXISTS manual_film_versions_latest ON manual_film_versions(film_id, synced_at DESC);

CREATE TABLE IF NOT EXISTS cinema_rate_limits (
  client_digest TEXT PRIMARY KEY,
  window_started INTEGER NOT NULL,
  request_count INTEGER NOT NULL CHECK(request_count > 0)
);
