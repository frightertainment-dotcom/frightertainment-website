import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { inflateSync } from 'node:zlib';

const root = path.resolve(import.meta.dirname, '..');
const context = { window: {}, URL, Intl };
vm.runInNewContext(readFileSync(path.join(root, 'fr-rating-badge.js'), 'utf8'), context);
const badge = context.window.FRRatingBadge;

// Read the source and extracted RGBA pixels without adding an image dependency.
function rgba(file) {
  const data = readFileSync(path.join(root, file));
  assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  let width, height, depth, colour, interlace;
  const chunks = [];
  for (let position = 8; position < data.length;) {
    const length = data.readUInt32BE(position);
    const type = data.toString('ascii', position + 4, position + 8);
    const bytes = data.subarray(position + 8, position + 8 + length);
    if (type === 'IHDR') {
      width = bytes.readUInt32BE(0); height = bytes.readUInt32BE(4);
      depth = bytes[8]; colour = bytes[9]; interlace = bytes[12];
    }
    if (type === 'IDAT') chunks.push(bytes);
    position += length + 12;
    if (type === 'IEND') break;
  }
  assert.equal(depth, 8);
  assert.equal(colour, 6);
  assert.equal(interlace, 0);
  const scanlines = inflateSync(Buffer.concat(chunks));
  const pixels = Buffer.alloc(width * height * 4);
  const stride = width * 4;
  let offset = 0;
  for (let y = 0; y < height; y++) {
    const filter = scanlines[offset++];
    for (let x = 0; x < stride; x++) {
      const raw = scanlines[offset++];
      const left = x >= 4 ? pixels[y * stride + x - 4] : 0;
      const above = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const upperLeft = y > 0 && x >= 4 ? pixels[(y - 1) * stride + x - 4] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = above;
      else if (filter === 3) predictor = Math.floor((left + above) / 2);
      else if (filter === 4) {
        const p = left + above - upperLeft;
        const a = Math.abs(p - left), b = Math.abs(p - above), c = Math.abs(p - upperLeft);
        predictor = a <= b && a <= c ? left : b <= c ? above : upperLeft;
      } else assert.equal(filter, 0);
      pixels[y * stride + x] = (raw + predictor) & 255;
    }
  }
  return { width, height, pixel: (x, y) => [...pixels.subarray((y * width + x) * 4, (y * width + x + 1) * 4)] };
}

test('the transparent F keeps source-logo pixels and excludes the neighbouring letter', () => {
  const source = rgba('assets/frightertainment-brand.png');
  const letter = rgba('assets/frightertainment-f.png');
  assert.deepEqual([source.width, source.height], [1867, 634]);
  assert.deepEqual([letter.width, letter.height], [205, 389]);
  for (let y = 0; y < letter.height; y++) {
    for (let x = 0; x < letter.width; x++) {
      const actual = letter.pixel(x, y);
      if (x >= 170 && y + 125 >= 211) assert.equal(actual[3], 0);
      else assert.deepEqual(actual, source.pixel(x, y + 125));
    }
  }
  assert.equal(letter.pixel(0, 0)[3], 0);
  assert.equal(letter.pixel(80, 55)[3] > 240, true);
  assert.equal(letter.pixel(204, 388)[3], 0);
});

test('media scores stay on the native 0–10 TMDB scale', () => {
  const options = badge.fromTmdbMedia({ voteAverage: 7.65, voteCount: 20, ratingKind: 'tmdb-community', sourceUrl: 'https://www.themoviedb.org/movie/12' });
  assert.equal(options.score, 7.65);
  assert.match(badge.html(options), /7\.7<small>\/10<\/small>/);
  assert.match(badge.html(options), /TMDB audience rating 7\.7 out of 10 from 20 votes/);
  assert.match(badge.html(options), /fr-rating-badge__votes[^>]*>· 20 votes/);
  assert.throws(() => badge.html(badge.fromTmdbMedia({ voteAverage: 8, voteCount: 3 })), /TMDB audience source/);
});

test('chart scores convert once from 0–100 and never render critic data as TMDB', () => {
  const options = badge.fromTmdbChart({ averageScore: 81, voteCount: 1250, tmdbId: 13, ratingKind: 'tmdb-community' });
  assert.equal(options.score, 8.1);
  assert.match(badge.html(options), /8\.1<small>\/10<\/small>/);
  assert.match(badge.html(options), /1,250 votes/);
  assert.match(badge.html(options), /href="https:\/\/www\.themoviedb\.org\/movie\/13"/);
  assert.throws(() => badge.html(badge.fromTmdbChart({ averageScore: 81, voteCount: 3, ratingKind: 'professional-critics' })), /TMDB audience source/);
  assert.equal(badge.fromTmdbChart({ averageScore: 8.1, voteCount: 3 }).score, null);
});

test('zero, missing, delayed and maximum scores have honest states in every size', () => {
  for (const size of ['compact', 'standard', 'feature']) {
    const zero = badge.html({ score: 0, voteCount: 1, source: 'tmdb', size });
    assert.match(zero, /TMDB audience rating 0\.0 out of 10 from 1 vote/);
    assert.match(zero, new RegExp(`fr-rating-badge--${size}`));
    assert.match(badge.html({ score: 10, voteCount: 3, source: 'tmdb', size }), /10\.0<small>\/10<\/small>/);
    assert.match(badge.html({ score: null, voteCount: 0, source: 'tmdb', size }), /Not yet rated/);
    assert.match(badge.html({ score: null, voteCount: 3, source: 'tmdb', size }), /Rating unavailable/);
    assert.match(badge.html({ score: 7, voteCount: 3, source: 'tmdb', size, state: 'loading' }), /Checking rating…/);
  }
  assert.throws(() => badge.html({ score: 7, voteCount: 3, source: 'podcast' }), /TMDB audience source/);
  assert.match(badge.html({ score: 7, voteCount: 3, source: 'tmdb', sourceUrl: 'javascript:alert(1)' }), /<span class="fr-rating-badge__source">TMDB audience<\/span>/);
});
