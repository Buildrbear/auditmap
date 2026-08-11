# Pittsburgh Source-Persistence Handoff

## Assignment

- Scope: the eight-place Pittsburgh super-enrichment campaign and its 21 retained destinations
- Assignment: active AuditMap nationwide enrichment continuation; repair the Pittsburgh defect exposed after Philadelphia
- OpenTask assignment: not separately supplied
- GitHub issue: not separately supplied
- Pull request: https://github.com/Buildrbear/auditmap/pull/28 (draft, stacked on PR #27)
- Checked: 2026-08-11
- Production publication: not performed

## Outcome

Schenley Park, Frick Park, and Point State Park had completed evidence-gate pages and correct campaign-level galleries, but stale copies remained in `all-subsites-ready`, `pilot-subsites-ready`, and the national parent source. A broad generation could therefore restore eight legacy destination cards, four-image galleries, recycled destination photos, and approximate positions.

The repair restores the authoritative records for all eight Pittsburgh parents, 54 existing reviewed photographs, and 21 evidence-complete destinations. The Pittsburgh enrichment script now refreshes `launch-map-places`, and the verifier checks both subsite source files plus national and campaign parent sources before accepting rendered output. A clean full generation in an isolated output directory preserved the corrected records.

No factual claim, coordinate, image selection, stable ID, canonical route, or destination decision was newly introduced. This contribution persists the already reviewed Pittsburgh campaign as its source of truth.

## Official Sources And Image Rights

Schenley Park and Frick Park parent guidance was checked on 2026-08-06, with their destination profiles rechecked on 2026-08-10. The remaining parent and destination guidance was checked on 2026-08-10. Principal operator sources are:

- City of Pittsburgh park directory: `https://www.pittsburghpa.gov/Recreation-Events/Parks-Greenways/Our-Parks`
- Point State Park, Pennsylvania DCNR: `https://www.pa.gov/agencies/dcnr/recreation/where-to-go/state-parks/find-a-park/point-state-park`
- Emerald View Park planning and visitor context: `https://engage.pittsburghpa.gov/emerald-view-park/story/134/147`
- Mellon Park: `https://www.pittsburghpa.gov/Recreation-Events/Parks/Our-Parks/Mellon-Park`
- North Shore Riverfront Park: `https://www.pittsburghpa.gov/Recreation-Events/Parks/Our-Parks/North-Shore-Riverfront-Park`

The 54 existing local gallery images and their source pages, creators, licenses, and alt text remain recorded in `data/pittsburgh-photo-research.json` and `data/generated/pittsburgh-super-images.json`. No image file or rights claim changed. Every referenced raw asset exists, and the campaign continues to require public-domain or Creative Commons reuse terms rather than inferring permission from an operator page.

## Verification

- JavaScript syntax checks passed for the Pittsburgh enrichment and verifier scripts.
- `npm run generate` completed against an isolated output directory; all eight Pittsburgh records retained their reviewed galleries and answer sets.
- `npm run verify:pittsburgh:super` passed eight parents, 21 exact destinations, source layers, raw HTML, coordinates, images, and visitor answers.
- All 51 national enrichment campaign verifiers passed with zero failures.
- North Carolina image-rights and generated-page safeguards passed, as did Raleigh discovery-loop verification.
- All 29 Pittsburgh parent and destination routes passed 390-pixel checks; all eight parent routes passed 1440-pixel checks. No horizontal overflow, missing heading, missing canonical tag, short blank page, or browser warning/error was observed.
- Every referenced raw Pittsburgh gallery asset exists. A plain local server cannot emulate Vercel image optimization, so optimized image payloads remain a draft-preview check.

## Unresolved Review Queue

| Place | Field or feature | Conflict or missing evidence | Sources checked | Recommended next action |
| --- | --- | --- | --- | --- |
| Pittsburgh campaign | Draft preview | Optimized-image delivery and a representative deployed screenshot are not yet verified for this repair | Local raw assets and isolated full generation | Verify on the stacked PR preview before publication |
| Schenley and Frick Parks | Fast-changing visitor facts | Parent guidance was checked 2026-08-06; events, construction, seasonal facilities, parking, and closures remain volatile | City and destination operator sources already recorded per answer | Recheck operator guidance if maintainer review extends materially beyond the checked date |
| Remaining Pittsburgh guides | Fast-changing visitor facts | Hours, admission, pool or spray operations, reservations, events, and construction were checked 2026-08-10 | Campaign operator sources listed above and recorded per answer | Recheck before publication if conditions materially change |

## Risk And Publication

This repair changes data persistence and derived campaign records but does not alter production data, authentication, moderation, rate limits, analytics, dependencies, or API costs. The main risks are future broad-generation regression and fast-changing visitor guidance; the strengthened source-layer verifier addresses the former, while the latter remains an operator recheck responsibility. No secrets, private visitor data, paid APIs, live database writes, merge, production deployment, or promotion were performed.
