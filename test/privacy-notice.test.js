import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('the draft privacy and cookies page is readable and linked from visitor pages', async () => {
  const notice=await readFile(new URL('../privacy.html',import.meta.url),'utf8');
  for(const required of ['Frightertainment@gmail.com','Cloudflare','Google Fonts','Apple Podcasts','Steam','YouTube','Information Commissioner','legitimate interests','local storage','right to object'])
    assert.ok(notice.toLowerCase().includes(required.toLowerCase()),'notice missing '+required);
  assert.match(notice,/rel="canonical" href="https:\/\/www\.frightertainment\.com\/privacy\.html"/);
  assert.match(notice,/independent, non-commercial horror entertainment website run by an individual/);
  assert.match(notice,/It is not a registered company and does not currently sell products or services/);
  assert.match(notice,/The individual operating the website handles privacy enquiries/);
  assert.doesNotMatch(notice,/\b(?:Ltd|Limited|Inc|LLC)\b/,'Do not invent a corporate legal form');
  for(const file of ['index.html','contact.html','credits.html','movies.html','tv-shows.html','cinema.html','indie-movies.html','podcasts.html','games.html','all-horror-movies.html','archive-film.html','film.html','media.html']){
    const page=await readFile(new URL('../'+file,import.meta.url),'utf8');
    assert.match(page, /href="\/privacy\.html"/,'missing accessible privacy footer link: '+file);
  }
  const contact=await readFile(new URL('../contact.html',import.meta.url),'utf8');
  assert.match(contact, /class="contact-privacy"[^>]*>[\s\S]*?href="\/privacy\.html"/);
});
test('privacy page is included only through the same explicit public/preview allowlists',async()=>{
  for(const path of ['scripts/build-preview.mjs','scripts/build-production.mjs']){
    const source=await readFile(new URL('../'+path,import.meta.url),'utf8');
    assert.ok(source.includes("'privacy.html'"),path);
  }
  const generated=await readFile(new URL('../scripts/build-pages.mjs',import.meta.url),'utf8');
  assert.ok(generated.includes("'privacy.html'"),'generated sitemap privacy entry');
  const sitemap=await readFile(new URL('../sitemap.xml',import.meta.url),'utf8');
  assert.match(sitemap,/www\.frightertainment\.com\/privacy\.html/);
});


test('embedded media never contains an eagerly loaded Apple or Steam iframe',async()=>{
  for(const [file,provider,count] of [['podcasts.html','apple',3],['games.html','steam',11]]){
    const html=await readFile(new URL('../'+file,import.meta.url),'utf8');
    assert.doesNotMatch(html,/<iframe[^>]*\bsrc=/i,'unexpected third-party connection: '+file);
    assert.equal(html.split('data-player-provider="'+provider+'"').length-1,count);
    assert.match(html,/src="\/embed-consent\.js"/,'missing deliberate loading mechanism: '+file);
    assert.match(html,/data-player-url="https:\/\//);
  }
  const notice=await readFile(new URL('../privacy.html',import.meta.url),'utf8');
  assert.match(notice,/apple\.com\/legal\/privacy\/data\/en\/apple-podcasts-web/);
  assert.match(notice,/store\.steampowered\.com\/privacy_agreement/);
  const loader=await readFile(new URL('../embed-consent.js',import.meta.url),'utf8');
  assert.match(loader,/\.fr-player-gate__button/);
  assert.match(loader,/document\.createElement\('iframe'\)/);
});
