# Seven-page environment artwork — 13 October 2026

Status: **IMPLEMENTED_NOT_VERIFIED** for site integration. Fourteen compressed page-scene assets have been created and visually inspected as individual files. Browser composition, delivered preview assets and owner visual approval are separate checks.

## Provenance and permitted placement

All scenes were generated specifically for this Frightertainment implementation with the OpenAI `image_gen.imagegen` tool on 13 October 2026. The seven desktop scenes were generated from text descriptions of site-owned environments. Each portrait scene was separately recomposed with its corresponding generated desktop scene as a style/composition reference; it is not a resized or center-cropped desktop image. No outside stock image, named film poster, podcast cover, game screenshot, or official mark was supplied as a generation input. The files are intended for Frightertainment's **decorative page backgrounds and editorial transitions**, not as official promotional media for catalogued works. The site's actual names, scores and controls must remain DOM content. Use is subject to the image-generation service terms applicable to the owner's account.

Desktop source PNGs were natively generated at **1672 × 941**. Portrait source PNGs were natively generated at **940/941 × 1672**. `ImageMagick` converted the source PNGs to WebP with metadata stripped, method 6 and quality 84; delivered dimensions were retained exactly. The generated PNGs remain in the task workspace under `/workspace/generated_images/`; only the compressed delivery files are in the repository. There is no claim that the original generation was 4K. The requested detailed 3840 × 2160 native desktop master is **BLOCKED** by the available generator's native output limit. No interpolated upscale has been represented as a native 4K source. A connected image catalog tool did not return a working model list, and a paid external upscale would need separate authorization.

| Page | Existing palette source | Scene and intended focal placement | Desktop source ID; native/delivered dimensions; bytes | Mobile source ID; native/delivered dimensions; bytes |
| --- | --- | --- | --- | --- |
| Home | `hub.css` `--world-glow:#a4142b`; crimson | Wet pines, haunted estate and rust moon at right; dark left title area | `exec-514ce70a-f876-414d-a5df-ee8bba4ac9e4`; 1672 × 941; 165,324 B | `exec-692c20ed-dc5e-4937-8d26-b590a2c6d1e7`; 941 × 1672; 192,120 B |
| Movies | `hub.css` `--world-glow:#255d39`; sage green | Analogue-to-modern media room, tapes, reels, projector and CRT at right | `exec-78c7feee-bbc6-4037-9841-9fc42da78176`; 1672 × 941; 109,288 B | `exec-806cd75d-aa30-4f6a-b011-7620a7200fb7`; 941 × 1672; 143,906 B |
| TV Shows | `hub.css` `--world-glow:#214e82`; dark blue | Empty screening room with blank screens and glass at right | `exec-efe497cb-e354-48b0-a21a-8802079c5c92`; 1672 × 941; 61,046 B | `exec-acff20d7-015f-4b3f-b960-3d1f01814ab7`; 940 × 1672; 76,296 B |
| Cinema | Current Cinema styling in repository; burgundy/red with projector amber; no separate owner palette token was found | Midnight auditorium, blank screen, velvet seats and projection beam at right | `exec-68f3da4b-00b8-4395-9446-5e14f204098b`; 1672 × 941; 63,912 B | `exec-c39dc8e6-48bc-4837-b85e-28c95c1285f3`; 940 × 1672; 93,252 B |
| Indie Movies | `hub.css` `--world-glow:#a84620`; burnt copper | Underground microcinema, 16mm projector, film cans and worn seats at right | `exec-84bca1f4-80ae-4a5a-a1b9-9731d9c09b01`; 1672 × 941; 87,468 B | `exec-3c136a3b-34e1-4dfa-97d4-537e76ffc1c5`; 941 × 1672; 116,574 B |
| Podcasts | `hub.css` `--world-glow:#6e36a4`; violet | Professional microphone, booth glass, headphones and mixing desk at right | `exec-08f3b9fb-7011-4cbb-a706-325e4303998a`; 1672 × 941; 72,144 B | `exec-d56bc7b5-a2cf-4210-9fc8-7923dbd252de`; 940 × 1672; 72,654 B |
| Games | `hub.css` `--world-glow:#244fda`; cobalt | Survival-horror workstation, blank monitor, controller and concrete at right | `exec-617733a3-4370-4acb-8a7c-72ea579c8f24`; 1672 × 941; 95,340 B | `exec-bb8a06fc-a4ca-464f-bd1c-d430eba140d4`; 941 × 1672; 96,480 B |

Delivery paths follow `assets/themes/{home,movies,tv,cinema,indie,podcasts,games}-{wide,mobile}.webp`. All fourteen files total **1,445,804 bytes**. The original Frightertainment logo in `assets/frightertainment-brand.png` and existing title assets were not altered as part of this artwork task.

## Composition notes for integration

- Use each scene only on its matching page. The old `concept-2026.css` background forces `concept-haunted-house.png` on all `.fr-v5` pages with `!important`; that rule must be superseded or removed by the owning CSS work before these scenes will show correctly.
- Preserve the dark left region for heading and navigation. Wide scenes place recognisable objects at right. Portrait scenes position objects near the upper half and fade toward dark lower space. Inspect at each actual hero height: a `cover` crop on a short mobile banner can hide the subject, even with a portrait source.
- Treat each file as decorative atmosphere. Do not put actual catalogue titles, film marks or ratings into a generated background. CSS fades may join the art to the page, but opaque overlays will erase the intended environments.
- The PNG generation sources are not repository assets; generated source IDs above are provenance pointers in the task workspace. The WebP files are the durable delivered assets.

## Verification performed

I opened all fourteen generated scenes at readable size, checked that the seven environments are visibly distinct and that the delivered Home wide and Podcasts mobile WebP still render well after compression. `identify` confirmed the delivered dimensions listed above. This does not verify CSS usage, responsive selection, browser composition, authenticated preview delivery, or 4K quality.

## Integration update — 13 October 2026

Status: **IMPLEMENTED_NOT_VERIFIED** on the protected preview. The seven desktop and seven mobile scenes are now integrated through `fr-page-themes.css` and `fr-design-system.css`. Local Chromium screenshots for every destination at 390 and 1440 CSS pixels are in `docs/evidence/after/`; the corresponding baseline captures are in `docs/evidence/before/`. The page scene selection test confirms each destination requests its mobile scene at 390 pixels and wide scene at 1440 pixels. Local resource observations are recorded in `docs/evidence/after/theme-requests.json`. Each inner destination except Movies requests only its own scene; Movies also requests three destination previews in its Explore Movies links. Home intentionally requests its scene plus destination previews for its category tiles. The original native 4K master requirement remains blocked as described above.
