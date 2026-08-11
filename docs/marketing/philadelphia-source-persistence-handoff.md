# Philadelphia Source-Persistence Handoff

## Assignment

- Scope: the nine-place Philadelphia super-enrichment campaign and its 40 retained destinations
- Assignment: active AuditMap nationwide enrichment continuation; repair the first campaign defect exposed by the national verifier
- OpenTask assignment: not separately supplied
- GitHub issue: not separately supplied
- Pull request: pending, to be stacked on Tampa Bay draft PR #26
- Checked: 2026-08-11
- Production publication: not performed

## Outcome

The completed Philadelphia evidence pass existed in rendered pages, but the richer campaign records had not persisted in `all-subsites-ready`, `pilot-subsites-ready`, or the national parent source. A later broad generation therefore restored stale galleries, answers, and destination sets for Schuylkill Banks, Spruce Street Harbor Park, and Independence National Historical Park.

The repair restores the authoritative records for all nine Philadelphia parents, 51 reviewed licensed photographs, and 40 evidence-complete destinations. The Philadelphia enrichment script now also refreshes `launch-map-places`, and the verifier checks all three source layers in addition to rendered output. A clean full generation in an isolated output directory preserved the corrected image, answer, and destination counts.

No factual claim, coordinate, image selection, stable ID, or canonical route was newly invented or expanded in this repair. It persists the previously reviewed Philadelphia campaign as its source of truth.

## Official Sources And Image Rights

The retained campaign facts were most recently checked on 2026-08-10 against these operator sources:

- Philadelphia Parks & Recreation: `https://www.phila.gov/parks-rec-finder/#/location/fairmount-park/`, `https://www.phila.gov/parks-rec-finder/#/location/fdr-park/`, and `https://www.phila.gov/parks-rec-finder/#/location/rittenhouse-square/`
- Friends of the Wissahickon: `https://fow.org/visit-the-park/`
- Center City District: `https://www.centercityphila.org/explore/dilworth-park/`
- Historic Philadelphia: `https://historicphiladelphia.org/franklin-square/`
- Schuylkill River Development Corporation: `https://www.schuylkillbanks.org/`
- Delaware River Waterfront Corporation: `https://www.delawareriverwaterfront.com/places/spruce-street-harbor-park`
- National Park Service: `https://www.nps.gov/inde/planyourvisit/index.htm`

The 51 existing local images and their source pages, creators, licenses, and alt text remain recorded in `data/philadelphia-photo-research.json` and `data/generated/philadelphia-super-images.json`. No image file or rights claim changed. All referenced raw assets exist. The campaign continues to use public-domain or Creative Commons media and does not treat an operator-page image as reusable without a documented license.

## Verification

- JavaScript syntax checks passed for the Philadelphia enrichment and verifier scripts.
- `npm run generate` completed against an isolated output directory; all nine Philadelphia parents retained their reviewed galleries and at least eleven answers.
- `npm run verify:philadelphia:super` passed nine parents, 40 destinations, source records, raw HTML, coordinates, images, and visitor answers.
- The national campaign suite passed campaigns 1-32, including Philadelphia at campaign 31, then exposed a separate pre-existing Pittsburgh source/generated mismatch at campaign 33.
- North Carolina image-rights and generated-page safeguards passed, as did Raleigh discovery-loop verification.
- All 49 Philadelphia parent and destination routes passed 390-pixel checks; all nine parent routes passed 1440-pixel checks. No horizontal overflow, missing heading, missing canonical tag, short blank page, or browser warning/error was observed.
- Every referenced raw Philadelphia asset exists. A plain local server cannot emulate Vercel image optimization, so optimized image payloads remain a draft-preview check.

## Unresolved Review Queue

| Place | Field or feature | Conflict or missing evidence | Sources checked | Recommended next action |
| --- | --- | --- | --- | --- |
| Philadelphia campaign | Draft preview | Optimized-image delivery and a representative deployed screenshot are not yet verified for this repair | Local raw assets and isolated full generation | Verify on the stacked PR preview before publication |
| Philadelphia campaign | Fast-changing visitor facts | The retained facts were checked 2026-08-10; hours, tickets, closures, seasonal operations, construction, and events remain volatile | Campaign operator sources listed above | Recheck operator guidance if maintainer review extends materially beyond the checked date |
| Pittsburgh campaign | Source persistence | The national suite now reaches campaign 33 and finds stale source/generated destination sets for Schenley, Frick, and Point State Park | `verify:pittsburgh:super` | Repair in a separate, Pittsburgh-scoped contribution after this PR |

## Risk And Publication

This repair changes data persistence and derived campaign records but does not alter production data, authentication, moderation, rate limits, analytics, dependencies, or API costs. The main risks are future broad-generation regression and fast-changing visitor guidance; the strengthened source-layer verifier addresses the former, while the latter remains an operator recheck responsibility. No secrets, private visitor data, paid APIs, live database writes, merge, production deployment, or promotion were performed.
