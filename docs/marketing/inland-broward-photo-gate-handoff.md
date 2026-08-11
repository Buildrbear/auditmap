# Inland Broward Photo-Gate Handoff

## Assignment

- Scope: T.Y. Park, Tree Tops Park, and Vista View Park in Broward County, Florida
- Assignment: direct AuditMap owner request continuing the nationwide enrichment campaign
- OpenTask assignment: not separately supplied
- GitHub issue: not separately supplied
- Checked: 2026-08-11
- Production publication: not performed

## Outcome

All three parents remain photo-gated. Recent official visitor guidance was indexed, but the listed Broward County pages and PDFs returned HTTP 404 during final live validation, and none of the parks has four representative reusable photographs. No parent, subsite, generated route, redirect, or live database record is being published from this audit.

T.Y. Park returned ten CC BY results from one March 2007 event series. Visual review found near-duplicate portraits and decorated picnic-table scenes rather than ordinary coverage of the lake, Castaway Island, playground, campground, fitness loop, or visitor circulation. Tree Tops Park has strong current visual coverage, including its boardwalk and viewing tower, but the reviewed current Flickr set is all-rights-reserved; reusable search results were false matches from unrelated parks. Vista View Park's exact-location results are wildlife-focused or all-rights-reserved, while reusable search results depict unrelated places.

Files in this delivery:

- `data/inland-broward-evidence-gate-campaign.json`
- `data/inland-broward-photo-research.json`
- `data/inland-broward-evidence-gate-audit.json`
- `data/us-priority-enrichment-queue.json`
- `docs/marketing/inland-broward-photo-gate-handoff.md`
- `docs/marketing/national-enrichment-current-checkpoint.md`

## Official Sources Checked

- Broward County park directory and general park information
- Broward County Castaway Island 2026 schedule, admission, supervision, accessibility, and weather rules
- Broward County playground, splash-pad, bicycling, nature, and sports guides
- Broward County December 2025 Tree Tops Park briefing and advisory-board minutes
- Broward County May 2026 parks planning update

Every source URL, checked date, evidence classification, freshness risk, and photo-gate finding is recorded in `data/inland-broward-evidence-gate-audit.json`. Broward County's official search index had crawled these sources within the prior two weeks and exposed their contents, but direct GET requests and an independent web fetch returned HTTP 404 on 2026-08-11. They remain provenance for the audit, not currently reachable sources for publication.

## Image Rights Review

- T.Y. Park: ten Flickr/Openverse CC BY 2.0 event photographs reviewed and rejected as nonrepresentative parent coverage.
- Tree Tops Park: current exact-location Flickr set is all-rights-reserved; unrelated Openverse results rejected.
- Vista View Park: exact-location park album is all-rights-reserved; wildlife close-ups and unrelated Openverse results rejected.
- No official-site image was treated as reusable merely because it appeared on a public operator page.
- No proprietary listing, review-site, search-result, or AI-generated image was accepted.

## Verification

- Openverse reusable-license research completed for all three parents.
- All 61 returned candidates were reviewed by title, source, rights basis, and destination match; no representative parent photograph was accepted.
- The ten T.Y. Park candidates were visually reviewed together and confirmed as one repetitive event series.
- Campaign and audit JSON parse successfully.
- All listed Broward County source URLs returned HTTP 404 during final live checks; both Flickr rights pages returned HTTP 200.
- No generated page or UI changed, so Vercel preview and responsive layout checks do not apply to this research-only handoff.

Commands run and outcomes:

- `node scripts/research-openverse-campaign-images.js --campaign data/inland-broward-evidence-gate-campaign.json --output data/inland-broward-photo-research.json --page-size 20` — completed with 61 candidates across three parks.
- `node --check scripts/research-openverse-campaign-images.js` — passed.
- Structured Node validation of all four JSON files — passed; confirmed three deferred parents, 61 provenance-complete candidates, and zero accepted parents, subsites, generated pages, or production changes.
- Live HTTP checks of every audit source — Broward County sources returned 404; both Flickr rights pages returned 200.
- `git diff --check` — passed.

## Unresolved Review Queue

- T.Y. Park needs four varied reusable views covering ordinary park circulation and major amenities, not event portraits.
- Tree Tops Park needs permission-cleared or openly licensed coverage of the canopy/trails, boardwalk, viewing tower, and developed visitor areas.
- Vista View Park needs representative reusable views of the hill, paths, playground or splash pad, shelters or fitness facilities, and visitor circulation; wildlife close-ups are insufficient.
- Candidate subsites remain deferred until each independently clears current visitor guidance, exact position, and destination-specific reusable-photo gates.

## Next Cluster

Open a Miami waterfront evidence-gate rebuild covering Maurice A. Ferre Park, Bayfront Park, South Pointe Park, Lummus Park, Matheson Hammock Park, Crandon Park, Bill Baggs Cape Florida State Park, and Historic Virginia Key Beach Park. These existing enriched parents have strong official-source and reusable-photo potential, but their legacy destination cards must be re-audited rather than carried forward automatically.

## Risk And Publication

The main risks are substituting visually attractive but nonrepresentative or nonreusable images for real visitor evidence and relying on recently indexed official guidance whose public URLs are presently unavailable. Seasonal water facilities, park gate fees, construction, playground work, trail access, and event restrictions also require rechecks. No secrets, private visitor data, paid APIs, dependencies, production database writes, production deployment, merge, or promotion were introduced.
