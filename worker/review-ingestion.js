import { isISOAlpha2, isISODate, normalizeReview } from '../src/core.js';

const sha256 = async value => {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
};
const noCredsHttps = value => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
};
const safeName = value => String(value || '').trim().slice(0, 160);
const candidateFields = [
  'providerReviewId', 'filmId', 'filmYear', 'criticId', 'criticName', 'publication', 'publicationUrl',
  'reviewUrl', 'ratingKind', 'score', 'scoreOutOf', 'territory', 'publishedAt', 'checkedAt',
  'permissionCleared', 'professionalVerified', 'permissionEvidenceUrl', 'withdrawn'
];
const safeCandidate = value => Object.fromEntries(candidateFields.flatMap(key => {
  const item = value?.[key];
  if (typeof item === 'string') return [[key, item.slice(0, 1000)]];
  if ((typeof item === 'number' && Number.isFinite(item)) || typeof item === 'boolean') return [[key, item]];
  return [];
}));

async function readLimitedText(response, maximumBytes) {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel().catch(() => {});
        throw new TypeError('Licensed review feed response exceeds the 2 MB safety limit');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export function parseLicensedReviewFeed(payload, expectedProviderId) {
  if (!payload || typeof payload !== 'object' || payload.providerId !== expectedProviderId || !Array.isArray(payload.reviews) || payload.reviews.length > 3000) {
    throw new TypeError('Licensed review feed must return the configured providerId and an array of at most 3000 reviews');
  }
  const reviews = [];
  const questionable = [];
  const seenProviderIds = new Set();
  for (const raw of payload.reviews) {
    const providerReviewId = String(raw?.providerReviewId || '').trim();
    if (!/^[A-Za-z0-9._:-]{1,160}$/.test(providerReviewId)) {
      questionable.push({ raw, reason: 'Missing or invalid stable provider review ID' });
      continue;
    }
    if (seenProviderIds.has(providerReviewId)) {
      questionable.push({ raw, reason: 'Duplicate provider review ID in the same feed' });
      continue;
    }
    seenProviderIds.add(providerReviewId);
    if (raw.withdrawn === true) {
      const reviewUrl = noCredsHttps(raw.reviewUrl);
      if (!raw.filmId || !Number.isInteger(raw.filmYear) || !reviewUrl || !isISODate(raw.checkedAt)) {
        questionable.push({ raw, reason: 'Withdrawal event lacks canonical film, film year, review URL or check date' });
        continue;
      }
      reviews.push({ providerReviewId, withdrawn: true, filmId: String(raw.filmId), filmYear: raw.filmYear, reviewUrl, checkedAt: raw.checkedAt });
      continue;
    }
    const reviewUrl = noCredsHttps(raw.reviewUrl);
    const publicationUrl = noCredsHttps(raw.publicationUrl);
    const permissionEvidenceUrl = noCredsHttps(raw.permissionEvidenceUrl);
    const normalized = normalizeReview({
      ...raw,
      reviewUrl,
      publicationUrl,
      filmYear: raw.filmYear,
      ratingKind: raw.ratingKind,
      permissionCleared: raw.permissionCleared === true,
      professionalVerified: raw.professionalVerified === true
    });
    const criticName = safeName(raw.criticName);
    const criticId = typeof raw.criticId === 'string' ? raw.criticId.trim().slice(0, 160) : '';
    const publication = safeName(raw.publication);
    const territory = String(raw.territory || '').toUpperCase();
    if (!normalized || !/^[A-Za-z0-9._:@/+~-]{1,160}$/.test(criticId) || !publicationUrl || !permissionEvidenceUrl || !criticName || !publication || !isISOAlpha2(territory)) {
      questionable.push({ raw, reason: 'Review lacks a numeric professional score, valid source, identity, territory or explicit reuse permission evidence' });
      continue;
    }
    reviews.push({
      ...normalized,
      criticId,
      criticName,
      publication,
      publicationUrl,
      permissionEvidenceUrl,
      providerReviewId,
      providerId: expectedProviderId,
      sourceMethod: 'licensed-provider',
      territory
    });
  }
  return { reviews, questionable };
}

function feedUrl(env) {
  const href = noCredsHttps(env.REVIEW_FEED_URL || '');
  if (!href) throw new Error('Licensed review feed URL must be HTTPS and contain no embedded credentials');
  const url = new URL(href);
  if (url.search || url.hash) throw new Error('Licensed review feed URL must not contain query parameters or fragments; use Worker secrets for credentials');
  const allowedHosts = new Set(String(env.REVIEW_FEED_ALLOWED_HOSTS || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean));
  if (!allowedHosts.size || !allowedHosts.has(url.hostname.toLowerCase())) throw new Error('Licensed review feed host is not in REVIEW_FEED_ALLOWED_HOSTS');
  if (url.port && url.port !== '443') throw new Error('Licensed review feed must use the standard HTTPS port');
  return url;
}

export async function importLicensedReviews(env, db, fetchImpl = fetch) {
  if (env.REVIEW_FEED_ENABLED !== 'true') return { status: 'disabled', imported: 0, queued: 0, revisions: 0 };
  if (env.REVIEW_FEED_LICENSE_APPROVED !== 'true') throw new Error('Review feed activation requires documented commercial reuse approval');
  const providerId = String(env.REVIEW_FEED_PROVIDER_ID || '').trim();
  if (!/^[a-z0-9][a-z0-9._-]{1,79}$/i.test(providerId)) throw new Error('Configured licensed review provider ID is invalid');
  if (!env.REVIEW_FEED_API_KEY) throw new Error('Licensed review provider credential is not configured');
  const url = feedUrl(env);
  const response = await fetchImpl(url, {
    method: 'GET', redirect: 'error', signal: AbortSignal.timeout(12_000),
    headers: { accept: 'application/json', authorization: `Bearer ${env.REVIEW_FEED_API_KEY}` }
  });
  if (!response.ok) throw new Error(`Licensed review provider request failed (${response.status})`);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) throw new TypeError('Licensed review feed must return JSON');
  let payload;
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > 2_000_000) throw new TypeError('Licensed review feed response exceeds the 2 MB safety limit');
  const responseText = await readLimitedText(response, 2_000_000);
  try { payload = JSON.parse(responseText); } catch { throw new TypeError('Licensed review feed returned invalid JSON'); }
  const parsed = parseLicensedReviewFeed(payload, providerId);
  const { results: canonicalFilms = [] } = await db.prepare(`SELECT film_id, title, film_year FROM canonical_films`).all();
  const filmById = new Map(canonicalFilms.map(film => [film.film_id, film]));
  const statements = [];
  const seenCritics = new Set();
  const seenReviewUrls = new Set();
  let imported = 0;
  let queued = 0;
  let revisions = 0;

  const queueCandidate = async (review, reason, sourceUrl) => {
    const safePayload = safeCandidate(review);
    const fingerprint = await sha256(`${providerId}:${JSON.stringify(safePayload)}:${reason}`);
    const candidateId = `provider-review:${fingerprint}`;
    statements.push(db.prepare(`INSERT INTO review_queue(item_id, item_kind, source_name, source_url, territory, payload_json, reasons_json, created_at)
      VALUES(?, 'licensed-review', ?, ?, ?, ?, ?, ?) ON CONFLICT(item_id) DO NOTHING`)
      .bind(candidateId, providerId, sourceUrl || url.href, review.territory || 'Unspecified', JSON.stringify(safePayload), JSON.stringify([reason]), new Date().toISOString()));
    queued++;
  };

  for (const review of parsed.reviews) {
    const film = filmById.get(review.filmId);
    const reviewUrl = noCredsHttps(review.reviewUrl);
    if (!film || !Number.isInteger(film.film_year) || film.film_year !== review.filmYear) {
      await queueCandidate(review, 'No approved canonical film record with this exact source-verified film year; match manually before importing.', reviewUrl);
      continue;
    }
    const current = await db.prepare(`SELECT review_id AS reviewId, film_id AS filmId, film_year AS filmYear, critic_id AS criticId, critic_name AS criticName,
      publication, publication_url AS publicationUrl, review_url AS reviewUrl, canonical_review_key AS canonicalReviewKey, score, score_out_of AS scoreOutOf,
      territory, published_at AS publishedAt, checked_at AS checkedAt, permission_cleared AS permissionCleared,
      permission_evidence_url AS permissionEvidenceUrl, professional_verified AS professionalVerified, status, provider_id AS providerId,
      provider_review_id AS providerReviewId FROM critic_reviews WHERE provider_id = ? AND provider_review_id = ?`).bind(providerId, review.providerReviewId).first();

    if (review.withdrawn) {
      if (!current) { await queueCandidate(review, 'Provider withdrawal has no matching imported review; verify the provider identity.', reviewUrl); continue; }
      const revisionKey = await sha256(`${providerId}:${review.providerReviewId}:withdrawn:${review.checkedAt}`);
      const revisionId = `revision:${revisionKey}`;
      statements.push(db.prepare(`INSERT INTO critic_review_revisions(revision_id, review_id, provider_id, provider_review_id, change_kind, previous_json, proposed_json, source_url, checked_at, created_at)
        VALUES(?, ?, ?, ?, 'withdrawn', ?, ?, ?, ?, ?) ON CONFLICT(revision_id) DO NOTHING`)
        .bind(revisionId, current.reviewId, providerId, review.providerReviewId, JSON.stringify(current), JSON.stringify(review), reviewUrl, review.checkedAt, new Date().toISOString()));
      revisions++;
      continue;
    }

    const criticKey = `${review.filmId}:${review.filmYear}:${review.criticId.toLowerCase()}`;
    const canonicalKey = review.dedupeKey;
    if (seenCritics.has(criticKey) || seenReviewUrls.has(canonicalKey)) {
      await queueCandidate(review, 'Duplicate critic contribution or review URL in this feed; only one eligible review per distinct critic can count.', reviewUrl);
      continue;
    }
    seenCritics.add(criticKey);
    seenReviewUrls.add(canonicalKey);

    if (current) {
      const comparable = value => JSON.stringify({ filmId: value.filmId, filmYear: value.filmYear, criticId: value.criticId, criticName: value.criticName,
        publication: value.publication, publicationUrl: value.publicationUrl, reviewUrl: value.reviewUrl, score: value.score, scoreOutOf: value.scoreOutOf,
        territory: value.territory, publishedAt: value.publishedAt, checkedAt: value.checkedAt, permissionCleared: Boolean(value.permissionCleared),
        professionalVerified: Boolean(value.professionalVerified), permissionEvidenceUrl: value.permissionEvidenceUrl });
      const proposed = { ...review, permissionEvidenceUrl: review.permissionEvidenceUrl };
      if (comparable(current) !== comparable(proposed)) {
        const revisionKey = await sha256(`${providerId}:${review.providerReviewId}:corrected:${JSON.stringify(proposed)}`);
        statements.push(db.prepare(`INSERT INTO critic_review_revisions(revision_id, review_id, provider_id, provider_review_id, change_kind, previous_json, proposed_json, source_url, checked_at, created_at)
          VALUES(?, ?, ?, ?, 'corrected', ?, ?, ?, ?, ?) ON CONFLICT(revision_id) DO NOTHING`)
          .bind(`revision:${revisionKey}`, current.reviewId, providerId, review.providerReviewId, JSON.stringify(current), JSON.stringify(proposed), reviewUrl, review.checkedAt, new Date().toISOString()));
        revisions++;
      }
      continue;
    }

    const duplicate = await db.prepare(`SELECT review_id FROM critic_reviews WHERE canonical_review_key = ? OR (film_id = ? AND film_year = ? AND lower(critic_id) = lower(?)) LIMIT 1`)
      .bind(canonicalKey, review.filmId, review.filmYear, review.criticId).first();
    if (duplicate) {
      await queueCandidate(review, 'This film already has a review from this critic or canonical source URL; editorial deduplication is required.', reviewUrl);
      continue;
    }
    statements.push(db.prepare(`INSERT INTO critic_reviews(review_id, film_id, release_year, critic_id, critic_name, publication, publication_url, review_url, canonical_review_key, score,
      score_out_of, territory, published_at, checked_at, permission_cleared, permission_evidence_url, professional_verified, status, source_method, film_year, provider_id, provider_review_id)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 1, 'pending', 'licensed-provider', ?, ?, ?)
      ON CONFLICT(provider_id, provider_review_id) DO NOTHING`)
      .bind(crypto.randomUUID(), review.filmId, review.filmYear, review.criticId, review.criticName, review.publication, review.publicationUrl, review.reviewUrl, canonicalKey,
        review.score, review.scoreOutOf, review.territory, review.publishedAt, review.checkedAt, review.permissionEvidenceUrl, review.filmYear, providerId, review.providerReviewId));
    imported++;
  }

  for (const candidate of parsed.questionable) {
    const review = safeCandidate({ ...candidate.raw, providerReviewId: String(candidate.raw?.providerReviewId || '').slice(0, 160) });
    await queueCandidate(review, candidate.reason, noCredsHttps(candidate.raw?.reviewUrl));
  }
  if (statements.length) await db.batch(statements);
  return { status: 'staged', imported, queued, revisions };
}
