# Greensboro Research-Completion Handoff

## Assignment

- Packet: `research-completion-nc-greensboro-01`
- Scope: Jimmie I. Barber Park and Oka T. Hester Park, Greensboro, North Carolina
- OpenTask assignment: https://opentask.ai/projects/cms6chmlu0003l204mn6qvfw6
- GitHub issue: https://github.com/Buildrbear/auditmap/issues/37
- Checked: 2026-08-20
- Contribution tier: inventory
- Production publication: not performed

## Outcome

Both inventory records are source-complete and remain launch-guide-photo-gated. The source intake now preserves stable names and aliases, current City of Greensboro sources, official municipal address-point coordinates, position-quality labels, checked dates, and Hester Park's separate arrival roles.

The Hester conflict is resolved without choosing a convenient but misleading single address. The current City visitor page names 3615 Deutzia Street as the park and office address, and explicitly names 800 Ailanthus Street for the athletic fields. These are two arrivals within Oka T. Hester Park, not duplicate parent places.

No parent or subsite page was generated. Eight Openverse queries returned zero reusable candidates. Wikimedia Commons exact-name and ten-kilometer geosearch returned nearby flora, wildlife, aerial rasters, roads, hotels, and unrelated places rather than representative park coverage. City-page images were not accepted because public display does not establish reuse permission.

## Accepted Records

- `/us/nc/greensboro/parks/jimmie-i-barber-park`
- `/us/nc/greensboro/parks/oka-t-hester-park`

Files changed for this packet:

- `data/research-intake/nc-major-public-parks-2026-08-13.json`
- `data/spatial-source-registry.json`
- `data/greensboro-research-completion-campaign.json`
- `data/greensboro-photo-research.json`
- `data/greensboro-research-completion-audit.json`
- `data/us-priority-enrichment-queue.json`
- `docs/marketing/greensboro-research-completion-handoff.md`
- `docs/marketing/national-enrichment-current-checkpoint.md`

## Official Sources Checked

- City of Greensboro Hester Park visitor page: https://www.greensboro-nc.gov/departments/parks-recreation/parks-gardens/hester-park
- City of Greensboro parks and gardens directory: https://www.greensboro-nc.gov/departments/parks-recreation/parks-gardens
- City of Greensboro Parks GIS layer: https://gis.greensboro-nc.gov/arcgis/rest/services/ParksRec/PD_2_MS/MapServer/4
- City of Greensboro Park Facilities GIS layer: https://gis.greensboro-nc.gov/arcgis/rest/services/ParksRec/PiedmontDiscovery_MS/MapServer/0
- City of Greensboro address-point service: https://gis.greensboro-nc.gov/arcgis/rest/services/GISDivision/GSONearMe/MapServer/0
- Greensboro Parks and Recreation Accessible Outdoor Amenities: https://www.greensboro-nc.gov/home/showpublisheddocument/51653/637786388434100000
- Greensboro Aquatic Facilities Master Plan facility audit: https://www.greensboro-nc.gov/home/showpublisheddocument/57354/638334077669830000

The exact source labels, checked dates, freshness expectations, coordinate object IDs, query URLs, accepted facts, and entrance classification are recorded in `data/greensboro-research-completion-audit.json` and the source intake. The main City site returned current content through browser-capable research, while direct command-line requests to its HTML and PDF endpoints returned HTTP 403. The three City GIS REST services returned HTTP 200. This is recorded as an anti-automation access difference and a future freshness-check requirement, not as proof that the public visitor sources were removed.

## Coordinate And Identity Decisions

- Jimmie I. Barber Park retains its stable full name; the City's shorter `Barber Park` is an alias.
- Barber's parent coordinate is City address-point OBJECTID 47795 for 1500 Barber Park Drive: `36.05127041, -79.75142641`.
- Oka T. Hester Park retains its full name; `Hester Park` is an alias.
- Hester's canonical public address is 3615 Deutzia Street. Its parent coordinate is City address-point OBJECTID 10915: `36.0170663, -79.85690298`.
- 800 Ailanthus Street is retained as the athletic-fields entrance. The current City page establishes that role directly; it is not a competing canonical address or separate park.
- The older parks GIS layer associates Hester's park reference and many facility records with 800 Ailanthus Street. Current visitor-page semantics control the public arrival labels, while GIS remains authoritative coordinate provenance.

## Image Rights Review

- Four Openverse queries per parent, eight total: zero reusable candidates returned.
- Wikimedia Commons exact-name and nearby geosearch: no representative exact-destination photograph accepted.
- Official City photographs: exact-location identity is plausible, but no image-specific reuse license or permission was found.
- No proprietary listing, review-site, search-result, or AI-generated image was accepted.

## Verification

Commands and outcomes are recorded in the pull request handoff. The required research-only checks cover JavaScript syntax for the image-research and packet-verification scripts, JSON integrity, Openverse output, national registry refresh and tests, claim state, source access behavior, official GIS object IDs, and clean diffs.

No generated page or UI changed, so Vercel image-optimizer, route, and responsive-layout checks are not applicable to this research-only contribution.

## Unresolved Review Queue

| Place | Field or feature | Conflict or missing evidence | Sources checked | Recommended next action |
| --- | --- | --- | --- | --- |
| Jimmie I. Barber Park | Parent photography | No representative reusable parent set | Openverse, Wikimedia Commons, City pages | Obtain four varied ordinary visitor views or written City reuse permission. |
| Oka T. Hester Park | Parent photography | No representative reusable parent set | Openverse, Wikimedia Commons, City pages | Obtain four varied views covering the lake, trail, recreation, and developed facilities, or written City reuse permission. |
| Both parents | Launch-guide visitor intents | Inventory evidence does not yet include a complete sourced answer set for dogs, transit, restroom availability, weather disruptions, and other recurring intents | Current City pages, directory, accessibility PDF, GIS | Complete these answers only after a separate launch-guide assignment and photo clearance. |

## Risks And Publication

City GIS facility attributes include older edit dates, so current City visitor pages control public-facing hours, fees, and entrance roles. Hester's seasonal closing schedule, fishing fees, reservations, weather closures, and normal-browser source access need rechecking before any launch-guide publication. GIS hosting does not grant image reuse rights.

No secrets, private visitor data, precise visitor-location logs, paid APIs, dependencies, generated pages, live database writes, deployment, merge, or production promotion were introduced.
