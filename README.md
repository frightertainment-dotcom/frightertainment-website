# FRIGHTERTAINMENT — Website starter (October 2026)

A real responsive static website ready to put on a hosting service. This is a *first version* — not yet connected to an automated film database, a review data licence, or a content management system.

## What works
- Live interactive filtering by year, review availability, title/genre, and sorting
- Six editorial release pages in pop-up dialogs with synopses and source links
- Four confirmed official YouTube trailer IDs; the player loads on click (privacy-enhanced embedding)
- Movie posters where an external preview image exists; a designed on-brand fallback where not
- Source-linked reviewer scores, normalised to /100 and averaged automatically (currently one film has two recorded scores)
- Mobile navigation, accessible dialogs, search, responsive layout and proper metadata
- Brand images are taken from the uploaded Frightertainment assets in their original high resolution and tightly cropped to transparency — no blurry AI re-rendering

## Preview locally
You can open `index.html` directly in Chrome/Edge or use a local web server:

```bash
cd frightertainment-site
python3 -m http.server 8080
```
Then visit http://localhost:8080

## Add or update a movie
Edit `data/movies.js`. Copy an object from `window.FR_MOVIES` and change its `id`, `title`, `release` (YYYY-MM-DD), `year`, `genre`, `country`, `studio`, `director`, `synopsis`, `teaser`, `poster`, `posterTheme`, `official`, `dateSource`, `trailerId`, `trailerChannel`, and `reviews` fields. The trailer ID is the part of a YouTube URL after `watch?v=`. Empty strings mean no media available. Only use confirmed official uploads, not fan trailers.

For a verified review, add a review object:

```js
reviews: [
  {
    source: 'Example Reviewer',
    score: 7.5,
    outOf: 10,
    display: '7.5 / 10',
    type: 'Editorial review',
    url: 'https://example.com/movie-review',
    checked: '2026-10-08'
  }
]
```

A `7.5/10` rating becomes `75/100`. The Fright Index is the equally weighted arithmetic mean of the eligible source scores, rounded to the nearest whole number. It does not blend audience and critic scores. **Do not add unverified results or remove links/attribution.** Metacritic and Rotten Tomatoes measure different concepts; the index is a convenience comparison, not an independent critic verdict.

## Publish at www.frightertainment.com
1. First ensure you own `frightertainment.com` via a domain registrar. This project cannot buy or transfer a domain for you.
2. Create a project in **Cloudflare Pages** or **Netlify** and upload the contents of this folder. No build command is required; the output directory is `/` for manual direct uploads.
3. Open the host's **Custom domains** settings, add both `frightertainment.com` and `www.frightertainment.com`. Follow the host-provided DNS instructions at your registrar. Avoid blindly pasting DNS entries: values depend on your host.
4. Choose whether `www` or the bare domain will be canonical and set the redirect in your host settings. Switch on managed HTTPS (usually automatic).
5. Test mobile, search, trailer playback, score links, domain and SSL.

The `www.frightertainment.com` address shown in page metadata is a **target**; the domain has not been configured or published by generating these files.

## Important publishing and licensing checks
- **Movie posters:** The live prototype references editorial preview poster images served on other sites; we have *not* obtained sublicensing rights. Images may fail due to hotlink restrictions, and you must replace them with authorised promotional assets/press-kit sources, observing the publisher's terms, before any public/commercial release. Empty poster slots show branded title art instead. Do not treat finding an image online as permission to host it.
- **Rotten Tomatoes:** RT has a licensing request process for use of its scores/trademarks/APIs, including source attribution and links. We cannot assume a right to republish or scrape scores. Verify with RT before launching with their scores displayed. https://www.rottentomatoes.com/help_desk/licensing
- **Metacritic, IGN and other reviewers:** Check their terms and request approval where needed for score republication. Do not automate scraping. If permission is unclear, show an outbound link to the primary review page instead of copying a score.
- **Trailers:** Official YouTube trailer links are embedded in a player only when visitors press play, subject to uploader embedding settings. Keep YouTube branding and terms intact.
- **Release dates:** Editorial snapshots can change, and worldwide release dates differ. Cite the studio or a dependable primary source and check them before publication.
- **Email, publishing editor, auto updates:** No back-end or account login is included yet. To have a true publish-from-dashboard workflow, connect a CMS in the next version.

## Where to go next
- Connect a CMS (for instance Sanity, Directus, or a Git-based CMS) so posts/movies/reviews are added through an admin dashboard.
- Get properly licensed movie metadata and poster feeds or studio press access.
- Add individually indexed movie URLs for SEO, news posts, review editorial guidelines, newsletters, analytics and schema markup.
- Add a user-facing editorial 'last checked' field and UK-specific release date where it differs from US.
