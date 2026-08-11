# Chesapeake Bay State-Park Evidence-Gate Handoff

## Assignment

- Scope: Sandy Point State Park and North Point State Park as one connected Chesapeake Bay batch
- Assignment: active AuditMap nationwide enrichment continuation
- OpenTask assignment: not separately supplied
- GitHub issue: not separately supplied
- Pull request and preview: pending
- Checked: 2026-08-11
- Production publication: not performed

## Outcome

Sandy Point State Park and North Point State Park now meet the four-photo parent gate. Each guide has current official visitor guidance, eleven recurring visitor-intent answers, exact parent coordinates with provenance, four reviewed reusable photographs, and records persisted across both subsite datasets, the launch map, and both parent-information sources.

Both parks remain parent-only. Available photographs are representative at the park level, but no proposed beach, pier, pavilion, trail, visitor center, playground, ramp, farmhouse, or other destination cleared exact current position, destination-specific reusable photography, nine-answer profile, and current operating evidence together. The privately owned Sandy Point Shoal Lighthouse is not a public park destination.

North Point's official sources conflict on opening time: its park page says 10 a.m. to sunset while the statewide reservation information says 8 a.m. to sunset. The guide records both and directs early visitors to confirm. It also preserves the current Crystal Pier partial closure, Trolley Station Pavilion renovation closure, unguarded-water warning, and alternate routing required by the Francis Scott Key Bridge closure.

## Official And Authoritative Sources

- Sandy Point State Park: `https://dnr.maryland.gov/publiclands/Pages/southern/sandypoint.aspx`
- North Point State Park: `https://dnr.maryland.gov/publiclands/Pages/central/northpoint.aspx`
- Maryland Park Service day-use reservations: `https://dnr.maryland.gov/publiclands/pages/park-dayuse-reservations.aspx`
- Maryland state-park reservations and service charges: `https://dnr.maryland.gov/publiclands/Pages/oc.aspx`
- Maryland DNR accessible public lands: `https://dnr.maryland.gov/publiclands/Pages/accessibleactivities.aspx?activity=AccessiblePublicLands`
- Black Marsh Natural Area: `https://dnr.maryland.gov/wildlife/Pages/NaturalAreas/Central/Black-Marsh.aspx`
- Maryland Transit Administration trip planner: `https://www.mta.maryland.gov/trip-planner`
- Maryland Transportation Authority Key Bridge updates: `https://mdta.maryland.gov/keybridgenews`
- Parent coordinate provenance: `https://www.openstreetmap.org/relation/13287493` and `https://www.openstreetmap.org/relation/4233254`

## Image Rights And Attribution

Eight local WebP assets were prepared from reviewed Wikimedia Commons source pages. Sandy Point uses three CC BY-SA photographs by Acroterion and Preservation Maryland plus a public-domain U.S. Environmental Protection Agency photograph by Eric Vance. They show the beach and Bay Bridge, farmhouse context, park landscape, and shoreline fishing and play.

North Point uses two CC BY-SA photographs by Ben Felps, one CC BY photograph by Nicolas Raymond, and one CC BY-SA photograph by Acroterion. They show waterfront visitor areas, fishing and pier context, the Pine Trail, and Chesapeake Bay shoreline.

Exact source pages, creators, licenses, license URLs, alt text, and selection decisions are recorded in `data/chesapeake-bay-evidence-gate-photo-selections.json` and `data/generated/chesapeake-bay-evidence-gate-images.json`. Event portraits, repetitive views, damaged structures, historic ruins, unrelated bridge views, and destination candidates that did not support a complete release were rejected.

## Verification

- JavaScript syntax checks passed for the image preparer, enrichment generator, and campaign verifier.
- The enrichment generator built two parent guides, eight reviewed images, and 22 sourced visitor answers with no evidence-gated destination pages.
- `npm run generate` completed successfully, followed by scoped regeneration of only the two new routes and their Maryland hubs after reversing unrelated full-generation churn.
- `npm run verify:chesapeake-bay:super` passed both parents, all eight local licensed images, all 22 source-backed answers, raw HTML, canonical metadata, coordinate provenance, and four persisted source layers.
- `npm run verify:enrichment:campaigns` passed all 54 campaign suites with zero failures.
- The complete `npm run release:enrichment:check` gate passed all 54 enrichment campaigns with zero failures, national discovery, 272 North Carolina image-rights records, 655 North Carolina generated-page checks, galleries, dog-park media rules, performance, and SEO.
- Full-generation-only national churn was reversed after the successful release gate; the reviewed Chesapeake Bay source and generated paths remain changed.
- Both parent routes passed local 390-by-844 and 1440-by-1000 browser checks with the correct heading and canonical tag, no application error overlay, no browser console errors, and no horizontal overflow. As required by the repository standard, local image-optimizer 404s were not treated as image verification.
- Pull-request preview and optimized-image checks remain pending.

## Unresolved Review Queue

| Place | Field or feature | Conflict or missing evidence | Recommended next action |
| --- | --- | --- | --- |
| Sandy Point | Beach zones, ramps, marina, playgrounds, nature center, trails, pavilions | No candidate cleared exact position, destination photograph, and complete current profile together | Keep detailed guidance on the parent until each complete evidence set clears |
| Sandy Point | Historic farmhouse | No current operator schedule confirms separate public access | Retain as visual and historical context only |
| Sandy Point | Sandy Point Shoal Lighthouse | Privately owned and not open to the public | Do not create a park destination page |
| North Point | Opening time | Official park page says 10 a.m.; statewide reservation information says 8 a.m. | Preserve both values and obtain operator resolution before normalizing |
| North Point | Takos Visitor Center | The same operator page gives appointment-only and summer-weekend schedule language | Confirm current staffed and restroom hours before publishing a schedule |
| North Point | Crystal Pier | Last approximately 100 feet closed after storm damage | Keep parent-only and recheck closure before any destination release |
| North Point | Trolley Station Pavilion | Closed for renovation | Keep parent-only until reopening and current photography clear |
| Annapolis and Anne Arundel follow-up | Quiet Waters Park, Truxtun Park, Downs Park, Kinder Farm Park, Fort Smallwood Park | Current reusable photo sets did not meet the representative parent gate | Retain in the deferred-photo queue |

## Risk And Publication

This batch changes source campaign data and generated static pages but does not alter production data, authentication, moderation, rate limits, analytics, dependencies, or API costs. Primary risks are fast-changing seasonal reservations and guarded-swim operations, conflicting North Point hours, facility closures, unguarded water, storm damage, and Key Bridge routing. No secrets, private visitor data, paid APIs, live database writes, merge, production deployment, or production promotion were performed.
