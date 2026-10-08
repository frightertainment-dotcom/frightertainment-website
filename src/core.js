export const MINIMUM_CRITICS = 3;
export const RANKING_LIMIT = 20;
const ISO_ALPHA2 = new Set('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' '));

export function isISOAlpha2(value) { return ISO_ALPHA2.has(value); }

export function isISODate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function isHTTPS(value) {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}

export function canonicalReviewKey(review) {
  try {
    const url = new URL(review.reviewUrl);
    url.search = '';
    url.hash = '';
    url.pathname = url.pathname.replace(/\/+$/, '');
    url.hostname = url.hostname.toLowerCase();
    return `${review.filmId}:${url.href}`;
  } catch { return ''; }
}

export function validateClaim(claim) {
  return Boolean(claim && claim.label && String(claim.value ?? '').trim() && claim.sourceName &&
    isHTTPS(claim.sourceUrl) && claim.territory && isISODate(claim.checkedAt));
}

export function normalizeReview(review) {
  if (!review || review.ratingKind !== 'numeric-professional-review') return null;
  if (!review.filmId || !Number.isInteger(review.releaseYear) || review.releaseYear < 1888) return null;
  if (!review.criticId || !review.publication || !review.publicationUrl || !isHTTPS(review.publicationUrl)) return null;
  if (!review.reviewUrl || !isHTTPS(review.reviewUrl) || !review.permissionCleared || ![true, 1].includes(review.professionalVerified)) return null;
  if (!review.territory || !isISODate(review.checkedAt) || !isISODate(review.publishedAt)) return null;
  if (!Number.isFinite(review.score) || !Number.isFinite(review.scoreOutOf) || review.scoreOutOf <= 0 || review.score < 0 || review.score > review.scoreOutOf) return null;
  const key = canonicalReviewKey(review);
  if (!key) return null;
  return { ...review, dedupeKey: key, normalizedScore: review.score / review.scoreOutOf * 100 };
}

export function selectEligibleReviews(reviews) {
  const uniqueByUrl = new Map();
  for (const candidate of reviews || []) {
    const normalized = normalizeReview(candidate);
    if (!normalized) continue;
    // Canonical URLs are globally unique within a film even if editorial metadata
    // accidentally assigns a syndicated copy to another critic identifier.
    if (!uniqueByUrl.has(normalized.dedupeKey)) uniqueByUrl.set(normalized.dedupeKey, normalized);
  }
  const uniqueByCritic = new Map();
  for (const normalized of uniqueByUrl.values()) {
    const key = `${normalized.filmId}:${normalized.releaseYear}:${normalized.criticId.toLowerCase()}`;
    const prior = uniqueByCritic.get(key);
    // One verified contribution per professional critic, per film and release year.
    // If an outlet republishes a review, keep the earliest original publication.
    if (!prior || normalized.publishedAt < prior.publishedAt ||
      (normalized.publishedAt === prior.publishedAt && normalized.reviewUrl < prior.reviewUrl)) {
      uniqueByCritic.set(key, normalized);
    }
  }
  return [...uniqueByCritic.values()];
}

export function averageReviews(reviews) {
  const eligible = selectEligibleReviews(reviews);
  if (eligible.length < MINIMUM_CRITICS) return { status: 'pending', average: null, criticCount: eligible.length, reviews: eligible };
  const mean = eligible.reduce((sum, review) => sum + review.normalizedScore, 0) / eligible.length;
  return { status: 'ranked', average: Math.round(mean), unroundedAverage: mean, criticCount: eligible.length, reviews: eligible };
}

export function buildAnnualRanking(films, reviews, year, previous = []) {
  if (!Number.isInteger(year) || year < 1888) throw new TypeError('year must be an integer film-release year');
  const hasPreviousRanking = previous.length > 0;
  const previousByFilm = new Map(previous.map(row => [row.filmId, row.position]));
  const candidates = films.filter(film => film.releaseYear === year).map(film => {
    const result = averageReviews(reviews.filter(review => review.filmId === film.id && review.releaseYear === year));
    return result.status === 'ranked' ? { filmId: film.id, title: film.title, ...result } : null;
  }).filter(Boolean);
  candidates.sort((left, right) => right.average - left.average || left.title.localeCompare(right.title));
  return candidates.slice(0, RANKING_LIMIT).map((film, index) => {
    const position = index + 1;
    const oldPosition = previousByFilm.get(film.filmId);
    return { ...film, position, movement: oldPosition == null ? null : oldPosition - position,
      movementLabel: oldPosition == null ? hasPreviousRanking ? 'NEW' : '—' : oldPosition === position ? '—' : oldPosition > position ? `UP ${oldPosition - position}` : `DOWN ${position - oldPosition}` };
  });
}

export function snapshotFreshness(snapshot, now = Date.now()) {
  if (!snapshot) return 'unavailable';
  const updatedAt = Date.parse(snapshot.updatedAt);
  if (!Number.isFinite(updatedAt)) return 'invalid';
  return updatedAt + snapshot.maxAgeMs >= now ? 'current' : 'stale';
}

export function validateDataset(dataset) {
  if (!dataset || !/^[a-z][a-z0-9-]{1,40}$/.test(dataset.kind || '')) throw new TypeError('Invalid dataset kind');
  if (dataset.country && !isISOAlpha2(dataset.country)) throw new TypeError('Territory must be an ISO 3166-1 alpha-2 code');
  if (dataset.country && dataset.territory !== dataset.country && !(dataset.kind === 'trending-horror' && dataset.territory === 'Global')) throw new TypeError('Dataset territory must match its country; global trend data must be explicitly global');
  if (!dataset.sourceName || !isHTTPS(dataset.sourceUrl) || !dataset.territory || !isISODate(dataset.checkedAt)) throw new TypeError('Dataset source, HTTPS link, territory and check date are required');
  if (!Array.isArray(dataset.items)) throw new TypeError('Dataset items must be an array');
  const seen = new Set();
  for (const item of dataset.items) {
    if (!item.id || seen.has(item.id) || !item.title || !item.sourceName || !item.territory || !isHTTPS(item.sourceUrl) || !isISODate(item.checkedAt)) {
      throw new TypeError('Every public item needs an id, title, source URL, territory and valid check date');
    }
    seen.add(item.id);
    if (item.releaseDate && (!isISODate(item.releaseDate) || !item.releaseTerritory || (dataset.country && item.releaseTerritory !== dataset.country))) throw new TypeError('Release dates require a valid date and matching explicit release territory');
    if (item.territory !== dataset.territory) throw new TypeError('Item territory must match the source dataset territory');
  }
  return dataset;
}

export function findDuplicateFilms(films) {
  const seenIds = new Set();
  const seenSourceKeys = new Set();
  const duplicates = [];
  for (const film of films || []) {
    const id = String(film.id || film.filmId || '');
    const titleKey = `${String(film.title || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase()}|${film.releaseYear || ''}|${film.territory || ''}`;
    if (id && seenIds.has(id)) duplicates.push({ kind: 'id', key: id });
    if (titleKey !== `|${film.releaseYear || ''}|${film.territory || ''}` && seenSourceKeys.has(titleKey)) duplicates.push({ kind: 'title-year-territory', key: titleKey });
    if (id) seenIds.add(id);
    seenSourceKeys.add(titleKey);
  }
  return duplicates;
}

export async function refreshWithLastGood({ load, validate, publish, readLastGood, logFailure }) {
  try {
    const fresh = await load();
    const valid = validate(fresh);
    await publish(valid);
    return { status: 'published', dataset: valid };
  } catch (error) {
    await logFailure(error);
    return { status: 'retained', dataset: await readLastGood(), error: String(error?.message || error) };
  }
}
