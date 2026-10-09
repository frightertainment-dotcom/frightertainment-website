# Frightertainment: provider permissions needed before automatic commercial feeds

Checked 9 October 2026. **No commercial licence has been granted or purchased.** This is a preparatory owner request, not approval or permission to scrape/republish third-party content.

## 1. Professional critic scores — Rotten Tomatoes / Fandango

Official contact: https://www.rottentomatoes.com/help_desk → Licensing → Business Proposal Form, https://fandango.az1.qualtrics.com/jfe/form/SV_0ieuKEYpn4S7nnM .

**Submission text (ready to copy into the form):**

> Hello Rotten Tomatoes licensing team,
>
> I'm contacting you on behalf of Frightertainment (https://www.frightertainment.com), a UK-based independent horror entertainment and discovery website.
>
> We currently generate no website revenue but plan to introduce advertising or sponsorship at a later stage. Our budget is limited while the website is being developed.
>
> Could you advise whether an affordable small-publisher or limited pilot licensing arrangement is available to display and periodically refresh the Rotten Tomatoes critic Tomatometer percentage for horror films, including older films and new cinema, direct-to-video and streaming releases?
>
> Our goal is an annual Top 20 horror chart plus separately identified publisher ratings on film detail pages, with clear attribution and links back to your film pages. We would avoid branded artwork and score icons unless expressly permitted.
>
> Please explain commercial-use pricing, any minimum monthly fees, daily/weekly update and caching permissions, permitted historical coverage and required trademark/attribution provisions. In particular, would a non-revenue development pilot be possible before commercial monetisation?
>
> Thank you for considering Frightertainment.

**Owner action:** Complete the official Business Proposal Form. It may require contact or company details that the owner must supply directly. Do not invent personal information or sign a contract without owner approval. Do not deploy automatically refreshed Tomatometer numbers before written approval. It is not enough to have a third-party GitHub proxy/scraper of RT.

## 2. UK cinema and streaming availability — Watchmode

Official commercial information: https://api.watchmode.com/ and contact form https://api.watchmode.com/support .

**Submission text:**

> Hello Watchmode,
>
> Frightertainment is an independent UK horror-film discovery website, currently pre-revenue and planning future advertising/sponsorship. We want accurate UK-focused information about where a film can be watched and which horror titles are newly available for subscription streaming, digital rental or purchase.
>
> We currently have a small development budget. Is a discounted starter programme, pre-revenue pilot, lower-volume commercial tier or licensed editorial trial available? We would like to know pricing, country coverage (especially GB), update cadence, permitted data retention and links to streaming providers. We won't display third-party posters without separate rights.
>
> Would you please advise the most affordable compliant option?

Watchmode's currently published commercial Startup tier is priced significantly above Frightertainment's early-stage £100–£200 monthly development budget. Confirm price before any account registration or payment. Its free tier is non-commercial; it is not an authorised public monetised streaming API.

## 3. Interim site behaviour while awaiting permissions

The private preview shows **source-linked, dated editorial announcements**, e.g. Shudder UK’s official October horror arrivals on its Letterboxd publisher list and Cineworld UK film release pages. This is original presentation of limited release-date facts, **not scraped platform catalogues or a guaranteed real-time streaming availability feed**.

The site must:
- Distinguish Shudder UK announced streaming arrivals, cinemas and separately listed digital buy/rent items.
- Show a title as coming next until its *announced* arrival date, then place it in the recent arrivals category for no more than 28 days. Source check dates must stay visible or directly accessible.
- Avoid claiming a movie is available today indefinitely merely because it appeared on a historical announcement list.
- Avoid ranking films with missing scores or substituting audience votes for professional critics.
- Preserve 9,772+ historical film links across all weekly imports.
- Keep licensed-data provider APIs and user keys **server-side** in Cloudflare only after account approval.
- Never add a paid plan, deploy to `main` or alter frightertainment.com DNS without the owner's explicit approval.

New source-checked editorial arrivals are maintained in `data/editorial-releases.json` and displayed by `release-brief.js`; update it by an explicit prompt or authorised scheduled review. This remains different from a genuine Watchmode-powered where-to-watch API.
