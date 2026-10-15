/* Generate static verified Indie archive for preview/production outage resilience.
   This is a source ledger, not a TMDB dump or a claim of worldwide completeness. */
import { writeFileSync } from 'node:fs';
import { VERIFIED_INDIE_FILMS, INDIE_YEARS, INDIE_REVIEW_DATE } from '../worker/verified-indie-films.js';
const data = {
  schemaVersion:1, reviewedAt:INDIE_REVIEW_DATE,
  scope:'Selected, individually source-checked independent horror films, not an exhaustive global film census.',
  availableYears:INDIE_YEARS,
  items:VERIFIED_INDIE_FILMS.map(({title,year,sourceName,sourceUrl}) => ({
    title,originalYear:year,indieSourceName:sourceName,indieSourceUrl:sourceUrl
  }))
};
writeFileSync(new URL('../data/indie-archive.json',import.meta.url), JSON.stringify(data,null,2)+'\n');
