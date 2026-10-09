import { averageReviews, buildAnnualRanking, MINIMUM_CRITICS } from '../src/core.js';

export const RANKING_METHOD = 'Equal-weight average of distinct, permission-cleared, verified professional numeric critic ratings normalized to /100; rounded to the nearest whole point. Audience scores and aggregator percentages are excluded.';

export function isRankingSchemaMissing(error) {
  return /no such (?:table|column)|unknown column|does not exist|has no column/i.test(String(error?.message || error));
}

export async function hasRankingSchema(db) {
  try {
    await db.prepare('SELECT film_year FROM canonical_films LIMIT 0').all();
    await db.prepare('SELECT film_year FROM annual_ranking_snapshots LIMIT 0').all();
    return true;
  } catch (error) {
    if (isRankingSchemaMissing(error)) return false;
    throw error;
  }
}

async function loadRankingSource(db, year) {
  const [{ results: films = [] }, { results: reviews = [] }] = await Promise.all([
    db.prepare(`SELECT film_id AS id, title, film_year AS filmYear
      FROM canonical_films
      WHERE editorial_status = 'approved' AND horror_verified = 1 AND film_year = ?
      ORDER BY title COLLATE NOCASE, film_id`).bind(year).all(),
    db.prepare(`SELECT film_id AS filmId, film_year AS filmYear, critic_id AS criticId, critic_name AS criticName,
      publication, publication_url AS publicationUrl, review_url AS reviewUrl,
      score, score_out_of AS scoreOutOf, territory, published_at AS publishedAt, checked_at AS checkedAt,
      (permission_cleared = 1) AS permissionCleared, (professional_verified = 1) AS professionalVerified,
      'numeric-professional-review' AS ratingKind
      FROM critic_reviews
      WHERE status = 'approved' AND permission_cleared = 1 AND professional_verified = 1 AND film_year = ?
      ORDER BY published_at, review_id`).bind(year).all()
  ]);
  return { films, reviews };
}

async function previousSnapshot(db, year, beforeDate) {
  const { results = [] } = await db.prepare(`SELECT ranked_at AS rankedAt, payload_json AS payload
    FROM annual_ranking_snapshots
    WHERE film_year = ? AND ranked_at < ?
    ORDER BY ranked_at DESC LIMIT 30`).bind(year, beforeDate).all();
  for (const row of results) {
    try {
      const payload = JSON.parse(row.payload);
      if (payload?.year !== year || !Array.isArray(payload.items) || payload.rankedFilms !== payload.items.length) continue;
      const items = payload.items.filter(item =>
        /^[a-z0-9-]{1,80}$/.test(item?.filmId || '') && Number.isInteger(item?.position) && item.position >= 1 && item.position <= 20);
      if (items.length !== payload.items.length) continue;
      return { ...row, items };
    } catch { /* Skip a corrupt snapshot and use the previous valid one. */ }
  }
  return null;
}

export async function createAnnualRankingPayload(db, year, now = new Date()) {
  if (!Number.isInteger(year) || year < 1888 || year > 2200) throw new TypeError('Invalid film year');
  if (!(await hasRankingSchema(db))) return null;
  const generatedAt = now.toISOString();
  const rankedAt = generatedAt.slice(0, 10);
  const [{ films, reviews }, previous] = await Promise.all([
    loadRankingSource(db, year),
    previousSnapshot(db, year, rankedAt)
  ]);
  const ranking = buildAnnualRanking(films, reviews, year, previous?.items || []);
  const pendingFilms = films.flatMap(film => {
    const result = averageReviews(reviews.filter(review => review.filmId === film.id));
    return result.status === 'pending' ? [{ filmId: film.id, title: film.title, criticCount: result.criticCount }] : [];
  });
  const previousSnapshotExists = Boolean(previous);
  const items = ranking.map(row => ({
    filmId: row.filmId,
    title: row.title,
    position: row.position,
    averageScore: row.average,
    criticCount: row.criticCount,
    movement: row.movement,
    movementLabel: row.movement === null && previousSnapshotExists ? 'NEW' : row.movementLabel,
    sources: row.reviews.map(review => ({
      critic: review.criticName,
      publication: review.publication,
      url: review.reviewUrl,
      territory: review.territory,
      checkedAt: review.checkedAt
    }))
  }));
  const reviewDataCheckedAt = reviews.map(review => review.checkedAt).filter(Boolean).sort().at(-1) || null;
  return {
    year,
    status: items.length ? 'ranked' : 'pending',
    minimumCritics: MINIMUM_CRITICS,
    methodology: RANKING_METHOD,
    updatedAt: generatedAt,
    generatedAt,
    reviewDataCheckedAt,
    rankedFilms: items.length,
    pendingFilmCount: pendingFilms.length,
    pendingFilms,
    items
  };
}

export async function publishAnnualRankingSnapshot(db, year, now = new Date(), trigger = 'cron-daily') {
  const payload = await createAnnualRankingPayload(db, year, now);
  if (!payload) return null;
  const rankedAt = payload.generatedAt.slice(0, 10);
  const startedAt = now.toISOString();
  const statements = [
    db.prepare(`INSERT INTO annual_ranking_snapshots(film_year, ranked_at, published_at, result_count, payload_json)
      VALUES(?, ?, ?, ?, ?)
      ON CONFLICT(film_year, ranked_at) DO UPDATE SET published_at = excluded.published_at,
        result_count = excluded.result_count, payload_json = excluded.payload_json`)
      .bind(year, rankedAt, payload.generatedAt, payload.rankedFilms, JSON.stringify(payload)),
    db.prepare(`INSERT INTO update_runs(run_id, task, country_code, trigger_name, status, started_at, finished_at, record_count)
      VALUES(?, ?, '', ?, 'published', ?, ?, ?)`)
      .bind(crypto.randomUUID(), `ranking-${year}`, trigger, startedAt, payload.generatedAt, payload.rankedFilms)
  ];
  await db.batch(statements);
  return payload;
}

export async function listRankingYears(db, currentYear = new Date().getUTCFullYear()) {
  const { results = [] } = await db.prepare(`SELECT DISTINCT film_year AS year
    FROM canonical_films
    WHERE editorial_status = 'approved' AND horror_verified = 1 AND film_year IS NOT NULL
    UNION SELECT ? AS year`).bind(currentYear).all();
  return [...new Set(results.map(row => row.year).filter(year => Number.isInteger(year)))].sort((left, right) => left - right);
}
