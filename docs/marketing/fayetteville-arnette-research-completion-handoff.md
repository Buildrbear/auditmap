# Fayetteville Arnette Park Research-Completion Handoff

## Assignment

- Packet: `research-completion-nc-fayetteville-01`
- Scope: Arnette Park, Fayetteville, North Carolina
- OpenTask assignment: https://opentask.ai/projects/cms6chmlu0003l204mn6qvfw6
- GitHub issue: https://github.com/Buildrbear/auditmap/issues/43
- Checked: 2026-08-20
- Contribution tier: inventory
- Production publication: not performed

## Outcome

Arnette Park now has a source-complete inventory identity, current visitor address, official municipal park point, reviewed coordinate provenance, a resolved visitor-versus-parcel address distinction, current public-use evidence, image-rights findings, and an explicit unresolved queue.

The former address conflict is resolved. The current City event record and municipal Park Points GIS agree on 2165 Wilmington Highway; the current event record supplies Fayetteville, NC 28306. The City park parcel uses 2161 Wilmington Highway as its property situs, not its visitor address. The legacy Old Wilmington Highway / 28301 form is not retained as a public entrance.

Current shelter rentals, a December 2025 public event, and a January 2026 trail-extension action establish active use. No current park-specific daily-hours source was found, so the 2013 seasonal schedule is not carried forward. No page was generated.

## Accepted Record

- `/us/nc/fayetteville/parks/arnette-park`

Files changed for this packet include the North Carolina source intake, spatial-source registry, packet campaign and audit, photo-research result, national checkpoint and queue, claim ledger, verifier, and this handoff.

## Official Sources Checked

- Current City event and location record: https://www.fayettevillenc.gov/Events/Drive-Thru-Christmas-in-the-Park
- City Park Points GIS: https://gismaps.ci.fayetteville.nc.us/opendata/rest/services/ParksRec/ParkPoints/MapServer/0
- City Parks boundary GIS: https://gismaps.ci.fayetteville.nc.us/opendata/rest/services/ParksRec/Parks/MapServer/0
- Current City rental fees and available shelters: https://www.fayettevillenc.gov/Parks-and-Recreation/Facilities/Rental-Fees-and-Usage-Charges
- Current City Parks and Recreation directory: https://www.fayettevillenc.gov/About-Fayetteville/Parks-Recreation
- Cumberland County January 2026 trail-extension action: https://www.cumberlandcountync.gov/departments/public-information-group/public-information/news-releases/news-release-full-story/2026/01/16/cumberland-county-commissioners-jan.-15-agenda-session-wrap-up

The City and County pages and both municipal GIS layers returned HTTP 200. The WebTrac item endpoint presented a Cloudflare challenge to direct requests, so current shelter facts are sourced to the accessible City fee page.

## Coordinate And Address Decisions

- Canonical name: Arnette Park; no unsupported alias added.
- Canonical visitor address: 2165 Wilmington Highway, Fayetteville, NC 28306.
- Parent coordinate: `35.00498326957595, -78.85757840132553`, City Park Points OBJECTID 4.
- Position quality: `reviewed-official-park-point`.
- The current City event pin at `35.0054729, -78.8568377` is retained as an official arrival cross-check.
- The City park polygon, OBJECTID 39 / FacilityID `ParkPoly4`, records Cumberland County ownership, 100 acres, and a 2161 Wilmington Highway property situs. That situs is not substituted for the visitor address.
- The legacy Old Wilmington Highway / ZIP 28301 form and the prior general geocoder coordinate are superseded by current operator and municipal GIS evidence.

## Current Use And Relationships

- Current public-use evidence: active City shelter rentals, the December 2025 Christmas in the Park record, and the January 2026 County trail-extension action.
- Arnette Shelters 1-4 are reservable facilities within the parent park; this inventory packet does not create standalone pages for them.
- The Cape Fear River Trail extension to Arnette Park is funded design work and is not represented as an open trail connection.
- Current general hours remain unresolved; the 2013 seasonal schedule is historical evidence only.

## Image Rights Review

- Four Openverse queries: zero reusable candidates.
- Wikimedia Commons exact-name and ten-kilometer geosearch: nearby Fayetteville results did not depict Arnette Park representatively.
- City event media has no image-specific reuse terms and is seasonal rather than a varied parent set.
- No proprietary listing, review-site, search-result, or AI-generated image was accepted.

## Unresolved Review Queue

| Place | Field or feature | Conflict or missing evidence | Sources checked | Recommended next action |
| --- | --- | --- | --- | --- |
| Arnette Park | Current general hours | Active use is current, but the only park-specific seasonal schedule found is from 2013 | Current City/County pages and GIS; 2013 County report | Obtain current operator confirmation; do not publish the 2013 schedule. |
| Arnette Park | Parent photography | No representative reusable four-photo parent set | Openverse, Wikimedia Commons, City pages | Obtain four varied current reusable views or written City permission. |
| Arnette Park | Launch-guide intents and amenity freshness | GIS amenities are undated and the full recurring visitor-answer set is incomplete | Current GIS, event, rental, directory, and project records | Complete under a separate launch-guide assignment after hours and photo gates clear. |

## Risks And Publication

The primary identity risk is reverting to the parcel situs or legacy address instead of the current 2165 Wilmington Highway / 28306 visitor address. The primary freshness risks are publishing the 2013 hours, treating undated GIS amenities as daily availability, or presenting the funded trail extension as open. City hosting does not grant image reuse rights.

No secrets, private visitor data, precise visitor-location logs, paid APIs, dependencies, generated pages, live database writes, deployment, merge, or production promotion were introduced.
