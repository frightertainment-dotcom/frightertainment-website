-- Keep a film's year of release separate from a territory-specific release year.
-- Only records with an explicit source-verified film-year claim are backfilled.
ALTER TABLE canonical_films ADD COLUMN film_year INTEGER
  CHECK (film_year IS NULL OR film_year BETWEEN 1888 AND 2200);
ALTER TABLE canonical_films ADD COLUMN film_year_source_name TEXT;
ALTER TABLE canonical_films ADD COLUMN film_year_source_url TEXT;
ALTER TABLE canonical_films ADD COLUMN film_year_checked_at TEXT;

ALTER TABLE critic_reviews ADD COLUMN film_year INTEGER
  CHECK (film_year IS NULL OR film_year BETWEEN 1888 AND 2200);
ALTER TABLE critic_reviews ADD COLUMN provider_id TEXT;
ALTER TABLE critic_reviews ADD COLUMN provider_review_id TEXT;
CREATE UNIQUE INDEX critic_reviews_provider_identity
  ON critic_reviews(provider_id, provider_review_id)
  WHERE provider_id IS NOT NULL AND provider_review_id IS NOT NULL;
CREATE INDEX canonical_films_film_year
  ON canonical_films(film_year, editorial_status, horror_verified);

-- A daily marker also records an honestly empty ranking. The payload is the
-- atomically published current chart, so failed runs leave the last valid one.
CREATE TABLE annual_ranking_snapshots (
  film_year INTEGER NOT NULL CHECK(film_year BETWEEN 1888 AND 2200),
  ranked_at TEXT NOT NULL,
  published_at TEXT NOT NULL,
  result_count INTEGER NOT NULL CHECK(result_count BETWEEN 0 AND 20),
  payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
  PRIMARY KEY(film_year, ranked_at)
);
CREATE INDEX annual_ranking_snapshots_recent
  ON annual_ranking_snapshots(film_year, ranked_at DESC);

CREATE TABLE critic_review_revisions (
  revision_id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL REFERENCES critic_reviews(review_id),
  provider_id TEXT NOT NULL,
  provider_review_id TEXT NOT NULL,
  change_kind TEXT NOT NULL CHECK(change_kind IN ('corrected', 'withdrawn')),
  previous_json TEXT NOT NULL,
  proposed_json TEXT NOT NULL,
  source_url TEXT NOT NULL,
  checked_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  created_at TEXT NOT NULL,
  reviewed_at TEXT,
  reviewer TEXT
);
CREATE INDEX critic_review_revisions_pending
  ON critic_review_revisions(status, created_at DESC);

-- These values are explicit film-year claims in the curated public catalogue.
-- The three other 2026 records remain NULL: their stored year describes dated
-- territorial release evidence only, not a separately verified film year.
UPDATE canonical_films SET
  film_year = 2026,
  film_year_source_name = 'Sony Pictures',
  film_year_source_url = 'https://www.sonypictures.com/movies/28yearslaterthebonetemple',
  film_year_checked_at = checked_at
WHERE film_id = '28-years-later-bone-temple' AND release_year = 2026
  AND primary_source_url = 'https://www.sonypictures.com/movies/28yearslaterthebonetemple';

UPDATE canonical_films SET film_year=2026, film_year_source_name='A24',
  film_year_source_url='https://a24films.com/films/backrooms', film_year_checked_at=checked_at
WHERE film_id='backrooms' AND release_year=2026 AND primary_source_url='https://a24films.com/films/backrooms';
UPDATE canonical_films SET film_year=2026, film_year_source_name='20th Century Studios',
  film_year_source_url='https://www.20thcenturystudios.com/movies/send-help', film_year_checked_at=checked_at
WHERE film_id='send-help' AND release_year=2026 AND primary_source_url='https://www.20thcenturystudios.com/movies/send-help';
UPDATE canonical_films SET film_year=2026, film_year_source_name='Paramount Pictures',
  film_year_source_url='https://www.paramountpictures.com/movies/scream-7', film_year_checked_at=checked_at
WHERE film_id='scream-7' AND release_year=2026 AND primary_source_url='https://www.paramountpictures.com/movies/scream-7';
UPDATE canonical_films SET film_year=2026, film_year_source_name='Sony Pictures',
  film_year_source_url='https://dev.sonypictures.com/movies/insidiousoutofthefurther', film_year_checked_at=checked_at
WHERE film_id='insidious-out-of-the-further' AND release_year=2026 AND primary_source_url='https://dev.sonypictures.com/movies/insidiousoutofthefurther';
UPDATE canonical_films SET film_year=2026, film_year_source_name='Searchlight Pictures',
  film_year_source_url='https://press.searchlightpictures.com/ready-or-not-2-here-i-come', film_year_checked_at=checked_at
WHERE film_id='ready-or-not-2' AND release_year=2026 AND primary_source_url='https://press.searchlightpictures.com/ready-or-not-2-here-i-come';
UPDATE canonical_films SET film_year=2026, film_year_source_name='British Council UK Films Database',
  film_year_source_url='https://filmsandfestivals.britishcouncil.org/projects/victorian-psycho', film_year_checked_at=checked_at
WHERE film_id='victorian-psycho' AND release_year=2026 AND primary_source_url='https://filmsandfestivals.britishcouncil.org/projects/victorian-psycho';

UPDATE canonical_films SET film_year=2025, film_year_source_name='Sony Pictures',
  film_year_source_url='https://www.sonypictures.com/movies/28yearslater', film_year_checked_at=checked_at
WHERE film_id='28-years-later' AND release_year=2025 AND primary_source_url='https://www.sonypictures.com/movies/28yearslater';
UPDATE canonical_films SET film_year=2025, film_year_source_name='Universal Pictures',
  film_year_source_url='https://www.universalpictures.com/movies/black-phone-2', film_year_checked_at=checked_at
WHERE film_id='black-phone-2' AND release_year=2025 AND primary_source_url='https://www.universalpictures.com/movies/black-phone-2';
UPDATE canonical_films SET film_year=2025, film_year_source_name='A24',
  film_year_source_url='https://a24films.com/films/bring-her-back', film_year_checked_at=checked_at
WHERE film_id='bring-her-back' AND release_year=2025 AND primary_source_url='https://a24films.com/films/bring-her-back';
UPDATE canonical_films SET film_year=2025, film_year_source_name='Universal Pictures',
  film_year_source_url='https://www.universalpictures.com/movies/five-nights-at-freddys-2', film_year_checked_at=checked_at
WHERE film_id='five-nights-at-freddys-2' AND release_year=2025 AND primary_source_url='https://www.universalpictures.com/movies/five-nights-at-freddys-2';
UPDATE canonical_films SET film_year=2025, film_year_source_name='Sony Pictures',
  film_year_source_url='https://www.sonypictures.com/movies/hearteyes', film_year_checked_at=checked_at
WHERE film_id='heart-eyes' AND release_year=2025 AND primary_source_url='https://www.sonypictures.com/movies/hearteyes';
UPDATE canonical_films SET film_year=2025, film_year_source_name='NEON',
  film_year_source_url='https://www.neonrated.com/film/the-monkey', film_year_checked_at=checked_at
WHERE film_id='the-monkey' AND release_year=2025 AND primary_source_url='https://www.neonrated.com/film/the-monkey';
UPDATE canonical_films SET film_year=2025, film_year_source_name='NEON',
  film_year_source_url='https://www.neonrated.com/film/together', film_year_checked_at=checked_at
WHERE film_id='together' AND release_year=2025 AND primary_source_url='https://www.neonrated.com/film/together';
UPDATE canonical_films SET film_year=2024, film_year_source_name='A24',
  film_year_source_url='https://a24films.com/films/heretic/', film_year_checked_at=checked_at
WHERE film_id='heretic' AND release_year=2024 AND primary_source_url='https://a24films.com/films/heretic/';
UPDATE canonical_films SET film_year=2024, film_year_source_name='NEON',
  film_year_source_url='https://www.neonrated.com/film/longlegs-film', film_year_checked_at=checked_at
WHERE film_id='longlegs' AND release_year=2024 AND primary_source_url='https://www.neonrated.com/film/longlegs-film';
UPDATE canonical_films SET film_year=2024, film_year_source_name='Focus Features',
  film_year_source_url='https://www.focusfeatures.com/nosferatu', film_year_checked_at=checked_at
WHERE film_id='nosferatu' AND release_year=2024 AND primary_source_url='https://www.focusfeatures.com/nosferatu';

UPDATE critic_reviews SET film_year = release_year
WHERE EXISTS (
  SELECT 1 FROM canonical_films f
  WHERE f.film_id = critic_reviews.film_id
    AND f.film_year = critic_reviews.release_year
    AND f.film_year_source_url IS NOT NULL
);
