# Frightertainment visual language — V2 working principles

The unchanged Gothic brand image is the masthead. Everything around it should behave like a considered horror publication and usable archive.

1. **One hierarchy per screen.** An introduction earns its height only if it reveals a source-backed film, date, chart or route sooner. At 320px, the first useful feature must begin above the dock.
2. **No at-rest frames.** Separate regions by scale, contrast, composition and space. Keep a visible `:focus-visible` outline for keyboard navigation. Remove decorative card strokes, pseudo-element corner boxes and ranking row rules as each component is rebuilt.
3. **Type conveys function.** Keep the original logo and approved section wordmarks intact. Use a small readable UI family and a restrained editorial serif. Reserve large display scale for a short feature title. Use normal word boundaries and inspect real long titles.
4. **Media identity is evidence.** A verified film poster, podcast square cover and game landscape image each have different ratios and rights. When rights or identity fail, use a neutral Frightertainment title card with clear accessibility labelling. Never create a false official poster.
5. **Truth before animation.** A missing Top 20 remains pending; a static film file is identified as an unranked film. A source date is shown only when it came from a matching claim. Interaction and motion never imply a playable film or an unverified trend.
6. **One quiet motion idea at a time.** Mostly 120–450ms interactions. No mandatory reveal, auto-playing audio, full-screen fog or endless motion over text. Reduced-motion and tab-hidden states must retain all content.
7. **Distinct pages, shared rules.** Home is an entrance, Movies a deep vault, TV a transmission, Indie an underground programme, Podcasts an audio publication, Games an interactive catalogue and Cinema a release diary. Reuse spacing, focus, media metadata and breakpoints without cloning the same hero/cards seven times.
8. **Lightweight by design.** Hold intrinsic image space, avoid oversized thumbnails and third-party requests for content below the fold. Measure Core Web Vitals on genuine field data when available; label local synthetic results separately.

## Lean working tokens

Existing implementation spans `styles.css`, `hub.css`, `v5-magazine.css`, `fr-design-system.css`, `fr-premium.css` and `fr-polish.css`. This slice edits the existing final layer and documents the target language; later passes must consolidate duplicate declarations instead of adding another override sheet.

| Role | Current V2 intent |
| --- | --- |
| Base / lifted surface | Near-black `#09090c`, charcoal `#101014`; use lifted surfaces only for purposeful contrast. |
| Brand accent | Blood red near `#9a2639`; use for one primary action or a small editorial signal, not every edge. |
| Section secondary tones | TV cold slate, Indie warm umber, Podcasts deep violet, Games restrained teal, Cinema muted ember. Keep all legible on near-black. |
| Body / heading | Working UI `DM Sans` with system fallback; editorial `Cormorant Garamond` with Georgia fallback. Font delivery, weights and CLS require the next typography audit. |
| Space | 8px small, 14–18px group, 24–36px section, responsive gutters; tune with real content rather than multiplying empty hero height. |
| Media | Film/TV 2:3; podcast 1:1; game cover and landscape screenshot remain separate; feature composition may break out of the card ratio. |
| Depth | Soft directional shadow and lighting only where content layers justify it. No stroke substitutes. |
| Focus | Clearly visible 2px high-contrast outline on keyboard focus, never always-on. |

References checked 18 October 2026: [BFI Sight and Sound](https://www.bfi.org.uk/sight-and-sound/) for editorial/archive distinction, [MUBI Notebook](https://mubi.com/en/notebook) for a film-publication model, and [web.dev Web Vitals](https://web.dev/articles/vitals) for measurement rules. These are conceptual references; their graphics, layout and code are not source assets. External rendered-site visual comparison remains to be done.
