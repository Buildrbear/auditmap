# Asheville Azalea Park Research-Completion Handoff

## Assignment

- Packet: `research-completion-nc-asheville-01`
- Scope: Azalea Park, Asheville, North Carolina
- OpenTask assignment: https://opentask.ai/projects/cms6chmlu0003l204mn6qvfw6
- GitHub issue: https://github.com/Buildrbear/auditmap/issues/39
- Checked: 2026-08-20
- Contribution tier: inventory
- Production publication: not performed

## Outcome

Azalea Park now has a source-complete inventory identity, current official address and map pin, reviewed coordinate provenance, a documented parent-versus-facility relationship, current recovery sources, image-rights findings, and an explicit unresolved queue.

The access question remains intentionally unresolved. The City's structured location record was modified on August 20, 2026 and publishes standard 6 a.m.-10 p.m. hours, but it does not say that Helene-closed areas reopened. The latest explicit area-status notice found says John B. Lewis Soccer Complex is open while all other areas of Azalea Park are closed. The July 2026 recovery project remains active. Standard hours are therefore not treated as a reopening notice.

Azalea Dog Park remains a distinct named facility within the parent complex and retains its existing record. It is not substituted for the parent and is not classified as a duplicate. No page was generated.

## Accepted Record

- `/us/nc/asheville/parks/azalea-park`

Files changed for this packet include the North Carolina source intake, spatial-source registry, packet campaign and audit, photo-research result, national checkpoint and queue, claim ledger, verifier, and this handoff.

## Official Sources Checked

- City of Asheville Azalea Park visitor page: https://www.ashevillenc.gov/locations/azalea-park/
- Structured City location record: https://www.ashevillenc.gov/wp-json/wp/v2/locations/72725
- Azalea Parks and Infrastructure Recovery: https://www.ashevillenc.gov/projects/azalea-parks-and-infrastructure-recovery/
- January 2026 park-area status notice: https://www.ashevillenc.gov/news/city-of-asheville-offices-closed-january-19-in-observance-of-martin-luther-king-jr-day/
- City Park Info Points GIS: https://services.arcgis.com/aJ16ENn1AaqdFlqx/ArcGIS/rest/services/Park_Info_Points/FeatureServer/0
- City Park Info legacy cross-check: https://services.arcgis.com/aJ16ENn1AaqdFlqx/ArcGIS/rest/services/Park_Info/FeatureServer/0
- Temporary Riverbend dog-park notice: https://www.ashevillenc.gov/news/city-of-asheville-opens-temporary-dog-park-at-riverbend-park-with-support-from-hca-healthcares-mission-health/

The public HTML pages returned HTTP 403 to direct command-line requests, while the official WordPress REST record and ArcGIS services returned HTTP 200. This is recorded as an access-method difference, not as missing public evidence.

## Coordinate And Identity Decisions

- Canonical name: Azalea Park; no unsupported alias added.
- Canonical address: 498 Azalea Road, Asheville, NC 28805.
- Parent coordinate: `35.5754035067782, -82.48586281337646`, the current City visitor map pin in WordPress location 72725 / external ID 338975.
- Position quality: `reviewed-official-location-pin`.
- The older City GIS Parks Info point at `35.5750473456806, -82.4887393825832` is retained only as an official cross-check.
- Azalea Dog Park is a related off-leash facility within the parent complex and already has a distinct AuditMap inventory record.
- John B. Lewis Soccer Complex is a separately named athletic facility; its reported opening does not establish access to the rest of Azalea Park.

## Image Rights Review

- Four Openverse queries: zero reusable candidates.
- Wikimedia Commons exact-name and ten-kilometer geosearch: nearby or similarly named results did not depict the exact destination representatively.
- City page media: planning art, historical material, recovery imagery, and mapping are publicly displayed but have no documented image-specific reuse license sufficient for AuditMap.
- No proprietary listing, review-site, search-result, or AI-generated image was accepted.

## Unresolved Review Queue

| Place | Field or feature | Conflict or missing evidence | Sources checked | Recommended next action |
| --- | --- | --- | --- | --- |
| Azalea Park | Current public access | Standard hours are current, but the latest explicit status notice still closes all areas except the soccer complex | Current location record, January status notice, July recovery project | Obtain an explicit current operator open-area statement. |
| Azalea Park | Parent photography | No representative reusable four-photo parent set | Openverse, Wikimedia Commons, City pages | Obtain four varied current reusable views or written City permission. |
| Azalea Park | Launch-guide visitor intents | Access-dependent parking, restroom, fishing, shelter, accessibility, dogs, transit, family, and weather answers are not publication-ready | City visitor/recovery sources and GIS | Complete under a separate launch-guide assignment after access and photo gates clear. |

## Risks And Publication

The primary safety risk is converting general operating-hours metadata into a reopening claim. The handoff prevents that. The City GIS attributes are older and do not control current availability. GIS or WordPress hosting does not grant image reuse rights.

No secrets, private visitor data, precise visitor-location logs, paid APIs, dependencies, generated pages, live database writes, deployment, merge, or production promotion were introduced.
