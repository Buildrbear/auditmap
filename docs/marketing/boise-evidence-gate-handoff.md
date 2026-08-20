# Boise River-Park Evidence-Gate Handoff

## Assignment

- Scope: Ann Morrison Park and Kathryn Albertson Park as one connected Boise batch
- Assignment: active AuditMap nationwide enrichment continuation
- OpenTask assignment: not separately supplied
- GitHub issue: not separately supplied
- Pull request: draft PR #32, stacked on Chesapeake Bay draft PR #31: `https://github.com/Buildrbear/auditmap/pull/32`
- Git-linked preview: Ready deployment `dpl_6sA4jroMAV6jxywbLXBTPV6PxTLr`: `https://auditmap-rjtoqtnzu-derrys-projects-f5a18cb6.vercel.app`
- Checked: 2026-08-11
- Hosted preview rechecked: 2026-08-20
- Production publication: not performed

## Outcome

Ann Morrison Park and Kathryn Albertson Park now meet the four-photo parent gate. Ann Morrison has fifteen current visitor answers and Kathryn Albertson has eleven, alongside complete official addresses, reviewed parent coordinates with provenance, four local reusable photographs apiece, and records persisted across both subsite datasets, the launch map, and both parent-information sources.

The batch corrects Kathryn Albertson Park's inherited address from `1001` to `1001 S Americana Boulevard, Boise, ID 83706` and replaces an unsupported claim that dogs are prohibited on interior paths. The current City page permits dogs year-round on leash. Ann Morrison's parent guidance now distinguishes general sunrise-to-sunset hours from lighted fields, the seasonal splash pad, river-float operations, and seasonal off-leash use.

Both parks remain parent-only. Named facilities and landscape features have useful evidence, but none yet clears exact operator-confirmed position, destination-specific current profile, accessibility and arrival detail, reusable photography, and nine destination answers together.

## Official And Authoritative Sources

- Ann Morrison Park: `https://www.cityofboise.org/departments/parks-and-recreation/parks/ann-morrison-park/`
- Kathryn Albertson Park: `https://www.cityofboise.org/departments/parks-and-recreation/parks/kathryn-albertson-park/`
- Valley Regional Transit trip planner: `https://www.valleyregionaltransit.org/trip-planner/`
- Ann Morrison coordinate provenance: `https://www.openstreetmap.org/way/24267212`
- Kathryn Albertson coordinate provenance: `https://www.openstreetmap.org/way/445009257`

All sources were checked on 2026-08-11. Hours, parking, restrooms, project closures, seasonal water operation, transit, and event availability are fast-changing and should be rechecked before publication or travel.

## Image Rights And Attribution

Ann Morrison reuses four existing local assets previously reviewed from three Wikimedia Commons files by Tamanoeconomico under CC BY-SA 4.0 and one Flickr photograph by cifraser1 under CC BY 2.0. They show a broad park view, playground, fountain, and Dog Island.

Kathryn Albertson adds four local WebP assets from exact Wikimedia Commons file pages by Tamanoeconomico under CC BY-SA 4.0. They show a paved wildlife-viewing path and lawn, Quail Corners pond habitat, the Riparian Run footbridge, and The Rookery gazebo. Repetitive entrance photographs, bench and snag close-ups, and a redundant second gazebo view were rejected after visual review.

Exact source pages, creators, licenses, license URLs, alt text, and selection decisions are recorded in `data/boise-evidence-gate-photo-selections.json` and `data/generated/boise-evidence-gate-images.json`.

## Verification

- JavaScript syntax checks passed for the image preparer, enrichment generator, and campaign verifier.
- The image preparer reused four reviewed Ann Morrison assets and created four reviewed Kathryn Albertson assets.
- The enrichment generator built two parent guides, eight reviewed images, and 26 source-backed visitor answers with no evidence-gated destination pages.
- Scoped generation completed for both parents and the Boise and Idaho hubs.
- `npm run verify:boise:super` passed both parents, all eight local licensed images, all 26 source-backed answers, raw HTML, canonical metadata, address corrections, coordinate provenance, and four persisted source layers.
- `npm run verify:enrichment:campaigns` passed all 55 campaign suites with zero failures.
- The complete `npm run release:enrichment:check` gate passed all 55 enrichment campaigns, national discovery, 272 North Carolina image-rights records, 655 North Carolina generated-page checks, galleries, dog-park media rules, performance, and SEO.
- Full-generation-only national churn was reversed after the successful release gate; the reviewed Boise source and generated paths remain changed.
- Both parent routes passed local 390-by-844 and 1440-by-1000 browser checks with the correct heading and canonical tag, no application error overlay, no browser console errors, and no horizontal overflow. Local image-optimizer 404s were expected and were resolved by the hosted checks below.
- The final-head Git-linked deployment in the authenticated AuditMap scope reached Ready for commit `16393bb4f9e2a3fc453be6dff664a11bac612cdc`, and GitHub's combined `Vercel – auditmap` status is successful.
- The Idaho hub, Boise park hub, Ann Morrison parent, and Kathryn Albertson parent returned their expected headings and canonical URLs through authenticated hosted access. All eight `/_vercel/image` requests returned HTTP 200 JPEG payloads.

## Unresolved Review Queue

| Place | Field or feature | Conflict or missing evidence | Recommended next action |
| --- | --- | --- | --- |
| Ann Morrison | Dog Island, playground, fountain, float takeout | Existing feature photographs do not yet combine with exact reviewed positions and complete destination profiles | Keep useful facts on the parent until each complete evidence set clears |
| Ann Morrison | Disc golf, traffic garden, courts, fields, gym, shelter, Greenbelt | Missing destination-specific photography or complete exact profiles | Keep parent-only and research as a future grouped facilities batch |
| Ann Morrison | Splash pad and river float | Seasonal operation changes independently of general park hours | Recheck immediately before seasonal publication or travel |
| Kathryn Albertson | The Rookery and The Eyrie | Named photos and operator descriptions exist, but exact operator-confirmed positions and complete destination accessibility and arrival profiles do not | Keep parent-only pending a complete reservation and map review |
| Kathryn Albertson | Quail Corners, Riparian Run, ponds, overlooks, main loop | Photographic evidence alone does not establish a current standalone destination profile | Keep as parent context until authoritative profiles clear |
| Kathryn Albertson | Russian olive removal | Active project conditions can change path access | Recheck the City project notice before publication and travel |

## Risk And Publication

This batch changes source campaign data and generated static pages but does not alter production data, authentication, moderation, rate limits, analytics, dependencies, or API costs. Main risks are seasonal water operations, river conditions, habitat protection, project closures, and facility or transit availability. No secrets, private visitor data, paid APIs, live database writes, merge, production deployment, or production promotion were performed.
