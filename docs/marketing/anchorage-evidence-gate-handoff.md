# Anchorage Evidence-Gate Handoff

## Assignment

- Scope: Kincaid Park, Far North Bicentennial Park, and Delaney Park Strip as one connected Anchorage batch
- Assignment: active AuditMap nationwide enrichment continuation
- OpenTask assignment: not separately supplied
- GitHub issue: not separately supplied
- Pull request: https://github.com/Buildrbear/auditmap/pull/29 (draft, stacked on PR #28)
- Preview: https://auditmap-5ritdd6jd-derrys-projects-f5a18cb6.vercel.app (Ready at commit `eb5165520e6d85d3a27b2a7ac31aec2d1a12dd58`, deployment `dpl_2zcUbTJFLAPSbCJ81TigTkDoV6LN`)
- Checked: 2026-08-11
- Production publication: not performed

## Outcome

Kincaid Park and Delaney Park Strip now meet the four-photo parent gate with current official visitor guidance and source records persisted across both subsite datasets, the launch map, and both parent-information sources. Far North Bicentennial Park remains visible as a sourced parent but is marked `photo-gated-deferred`: one representative winter trail view and one attributable volunteer-event photograph cleared review, while adjacent Campbell Tract imagery and repeated photographs from one work event were rejected as substitutes for varied park coverage.

Three destinations clear the exact-photo, exact-position, and destination-profile gate: Kincaid Beach, Centennial Rose Garden, and Alaska Railroad No. 556. Each has one destination-specific reusable photograph, an exact geotag or named OpenStreetMap object, nine source-backed visitor answers, and exact-coordinate navigation. No other inherited Anchorage facility was promoted.

## Official Sources

- Kincaid Outdoor Center and park access: `https://www.muni.org/Departments/parks/Pages/Kincaid.aspx`
- Kincaid Park 2026 master-plan project: `https://www.muni.org/Departments/parks/Pages/KincaidMP.aspx`
- Kincaid Beach trail project: `https://www.muni.org/Departments/parks/Documents/PRC%2015-09%20SR-RES.pdf`
- Far North Bicentennial Park / Hillside singletrack: `https://www.muni.org/Departments/parks/Pages/ServiceSingletrack.aspx`
- Anchorage trail rules and wildlife guidance: `https://www.muni.org/Departments/parks/pages/trails.aspx`
- Anchorage off-leash areas: `https://www.muni.org/Departments/parks/pages/dogparks.aspx`
- Delaney Park master plan: `https://www.muni.org/Departments/parks/Pages/DelaneyParkMasterPlan.aspx`
- Delaney Park memorial map: `https://www.muni.org/departments/parks/documents/delaneyparkmemorialpolicy.pdf`
- Delaney courts, fields, and rink listing: `https://www.muni.org/Departments/parks/Pages/Rinks_Fields_courts.aspx`

## Image Rights And Attribution

Ten local WebP assets were prepared from reviewed Wikimedia Commons source pages. Kincaid uses four photographs by Enrico Blasutto, Paxson Woelber, and Mike's Birds under CC BY-SA 4.0, CC BY 3.0, and CC BY-SA 2.0. Far North uses Agebauer's CC BY-SA 4.0 winter view and Matthew Vos / Bureau of Land Management public-domain event photograph. Delaney uses three CC BY-SA 4.0 photographs by Enrico Blasutto and one CC BY 2.0 locomotive photograph by Jason Riedy. Exact source pages, creators, licenses, license URLs, alt text, and review decisions are recorded in `data/anchorage-evidence-gate-photo-selections.json` and `data/generated/anchorage-evidence-gate-images.json`.

No official-site image was treated as reusable without a license. Adjacent Campbell Tract imagery, event portraits, ambiguous Anchorage matches, and near-duplicate volunteer-event views were rejected.

## Verification

- JavaScript syntax checks passed for the image preparer, enrichment generator, and verifier.
- Image preparation produced four Kincaid, two Far North, and four Delaney reviewed assets.
- Scoped and clean full generation completed successfully.
- `npm run verify:anchorage:super` passed two released parents, one photo-gated parent, three exact destinations, raw HTML, image rights, navigation coordinates, and four persisted source layers.
- All 52 super-enrichment campaign verifiers passed with zero failures.
- North Carolina image-rights and generated-page safeguards passed, as did Raleigh discovery-loop verification.
- All six retained Anchorage parent and destination routes passed 390-pixel checks; all three parent routes passed 1440-pixel checks. Each had a heading and canonical tag and no horizontal overflow. A plain local server cannot validate Vercel image optimization, so optimized image rendering remains a preview check.
- The source-identical Ready preview returned HTML for all six retained routes and image payloads for all ten optimized campaign images through the deployment-protection bypass.
- GitHub `validate`, `secrets`, Vercel Preview Comments, and the linked `Vercel – auditmap` status passed on the documentation head. The final-head Ready deployment also served all six routes and ten optimized images successfully.

## Unresolved Review Queue

| Place | Field or feature | Conflict or missing evidence | Sources checked | Recommended next action |
| --- | --- | --- | --- | --- |
| Far North Bicentennial Park | Parent gallery | Only two reusable images cleared review; one is a dated volunteer event | Municipality of Anchorage, BLM, Wikimedia Commons | Keep photo-gated until two additional varied, current park views clear rights and subject review |
| Kincaid Beach | Conditions | Tides, snow, ice, wildlife, and trail conditions change practical access | Municipality of Anchorage trail and park sources | Recheck operator alerts and weather before publication or a condition-sensitive visit |
| Centennial Rose Garden | Seasonal appearance | The garden is established and mapped, but bloom and maintenance are seasonal | Delaney Park Master Plan, memorial map, Wikimedia Commons, OpenStreetMap | Avoid promising bloom; recheck if a current municipal closure or renovation is posted |
| Alaska Railroad No. 556 | Hands-on access | The 2011 photograph shows temporary fencing and does not prove current climbing access | Delaney memorial map, Wikimedia Commons, OpenStreetMap | Follow current barriers; do not market the artifact as climbable without a current operator statement |

## Risk And Publication

This batch changes source campaign data and generated static pages but does not alter production data, authentication, moderation, rate limits, analytics, dependencies, or API costs. Primary risks are fast-changing winter access, wildlife conditions, seasonal horticulture, and insufficient representative media for Far North. No secrets, private visitor data, paid APIs, live database writes, merge, production deployment, or production promotion were performed.
