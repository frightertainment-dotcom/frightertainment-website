// Film-by-film editorial allowlist for the Indie Horror section.
// A low budget, an unfamiliar production-company name, or an independent distributor
// does NOT automatically qualify a franchise film.  Only source-checked titles enter
// this collection; expand it through documented editorial reviews.
// Original feature / festival year is separate from later regional theatrical dates.
export const INDIE_REVIEW_DATE = '2026-10-14';
const sources = Object.freeze({
  s26:'https://www.sundance.org/blogs/2026-sundance-film-festival-unveils-97-projects-selected-for-the-feature-film-and-episodic-program/',
  s25:'https://www.sundance.org/blogs/2025-sundance-film-festival-reveals-93-projects-for-feature-film-and-episodic-programs/',
  s24:'https://www.sundance.org/blogs/2024-sundance-film-festival-announces-91-projects-selected-for-the-feature-films-episodic-and-new-frontier-lineup-for-40th-edition/',
  s23:'https://www.sundance.org/blogs/2023-sundance-film-festival-announces-lineup-of-99-feature-films/',
  sx22:'https://sxsw.com/wp-content/uploads/2022/02/SXSW-2022-Festival-Slate-Release-FINAL.pdf',
  s20:'https://www.sundance.org/blogs/2020-sundance-film-festival-118-feature-films-announced-3/',
  s19:'https://www.sundance.org/blogs/2019-sundance-film-festival-112-features-announced-3/',
  classic:'https://www.sundance.org/blogs/30-years-of-chills-and-thrills-your-sundance-midnight-horror-watch-list-3/',
  s14:'https://www.sundance.org/festival-history/',
  fantasia25:'https://fantasiafestival.com/en/news/fantasia-2025-third-wave',
  rabbit:'https://brynchainey.com/rabbit-trap',
  desert:'https://www.thefilmcatalogue.com/films/horror-in-the-high-desert',
  desert2:'https://www.thefilmcatalogue.com/films/horror-in-the-high-desert-2-minerva',
  glass:'https://glasseyepix.com/projects/chronological/',
  habit:'https://www.ifccenter.com/films/habit-2/'
});
const records = [
  ['Buddy',2026,'s26',1514026],
  ['Leviticus',2026,'s26'],
  ["Mum, I'm Alien Pregnant",2026,'s26'],
  ['Rock Springs',2026,'s26'],
  ['Saccharine',2026,'s26'],
  ['Dead Lover',2025,'s25'],
  ["Didn't Die",2025,'s25'],
  ['Opus',2025,'s25'],
  ['Rabbit Trap',2025,'rabbit',1193824],
  ['Together',2025,'s25'],
  ['Touch Me',2025,'s25'],
  ['The Ugly Stepsister',2025,'s25',1284120],
  ['The Undertone',2025,'fantasia25'],
  ['I Saw the TV Glow',2024,'s24',858017],
  ['In a Violent Nature',2024,'s24',1214509],
  ['The Moogai',2024,'s24'],
  ['Your Monster',2024,'s24'],
  ['Handling the Undead',2024,'s24'],
  ['Talk to Me',2023,'s23'],
  ['Run Rabbit Run',2023,'s23'],
  ['Infinity Pool',2023,'s23'],
  ['birth/rebirth',2023,'s23'],
  ['Horror in the High Desert 2: Minerva',2023,'desert2'],
  ['Horror in the High Desert',2021,'desert'],
  ['Deadstream',2022,'sx22'],
  ['Hypochondriac',2022,'sx22'],
  ['Sissy',2022,'sx22'],
  ['Relic',2020,'s20'],
  ['Scare Me',2020,'s20'],
  ['Amulet',2020,'s20'],
  ['The Hole in the Ground',2019,'s19'],
  ['Depraved',2019,'glass'],
  ['The Innkeepers',2010,'glass'],
  ['Stake Land',2010,'glass'],
  ['Bitter Feast',2010,'glass'],
  ['The House of the Devil',2009,'glass'],
  ['I Sell the Dead',2008,'glass'],
  ['I Can See You',2008,'glass'],
  ['The Last Winter',2006,'glass'],
  ['The Roost',2005,'glass'],
  ['Habit',1995,'habit'],
  ['Hereditary',2018,'classic'],
  ['Mandy',2018,'classic'],
  ['The Witch',2015,'classic'],
  ['The Babadook',2014,'s14'],
  ['A Girl Walks Home Alone at Night',2014,'s14'],
  ['What We Do in the Shadows',2014,'s14']
];
export const VERIFIED_INDIE_FILMS = Object.freeze(records.map(([title, year, key, tmdbId]) =>
  Object.freeze({title,year,sourceName:key==='sx22'?'SXSW':key==='fantasia25'?'Fantasia':key==='rabbit'?'Filmmaker':key.startsWith('desert')?'Indie Rights':key==='glass'?'Glass Eye Pix':key==='habit'?'IFC Center':'Sundance',
    sourceUrl:sources[key],...Number.isInteger(tmdbId)?{tmdbId}:{}})));
export const INDIE_YEARS = Object.freeze([...new Set(VERIFIED_INDIE_FILMS.map(x=>x.year))].sort((a,b)=>b-a));
export const INDIE_EDITORIAL_POLICY =
  'Indie Horror is a source-checked selection of independently developed genre films. '+
  'Film-festival programmes and filmmaker production credits are reviewed before inclusion; '+
  'low budgets and independent distribution alone do not qualify a studio franchise. '+
  'The collection is selective, not a complete census. TMDB audience ratings remain attributed to TMDB.';
