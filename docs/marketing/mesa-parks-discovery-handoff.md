# Mesa Public Parks Catalogue-Breadth Handoff

## Assignment

- Packet: `research-completion-az-mesa-01`
- Scope: 25 named City of Mesa park parents
- OpenTask assignment: https://opentask.ai/projects/cms6chmlu0003l204mn6qvfw6
- GitHub issue: https://github.com/Buildrbear/auditmap/issues/49
- Checked: 2026-08-20
- Contribution tier: inventory
- Production publication: not performed

## Outcome

Twenty-five City of Mesa parks are qualified as net-new inventory parents from current City facility pages. Each record has a stable City facility ID, current canonical name and address, reviewed coordinates, source labels, checked dates, freshness classification, and a release-ledger state.

The batch follows the campaign breadth-recovery rule. It creates inventory and an exact claimable packet; it does not generate visitor pages or silently promote the records to launch guides.

## Accepted Parents

Red Mountain Park; Riverview Park; Desert Arroyo Park; Gene Autry Park; Quail Run Park; Desert Trails Park; Fitch Park; Park of the Canals; Skyline Park; Eagles Park; Countryside Park; Kleinman Park; Carriage Lane Park; Falcon Hill Park; Sherwood Park; Christopher J. Brady Park; Greenfield Park; Reed Park; Palo Verde Park; Pioneer Park; Mountain View Park; Dobson Ranch Park; Holmes Park; Heritage Park; and Fiesta Sports Park.

No current AuditMap Mesa route or normalized Mesa parent match was found. All 25 remain `needs-launch-guide` in the release ledger and are absent from the sitemap.

## Identity And Coordinate Decisions

- The current City directory controls canonical identity. `Monterey Park` and `Monterey` are retained as aliases for the renamed Christopher J. Brady Park instead of creating a duplicate.
- Twenty-one records use the current City facility-page visitor pin.
- Fitch Park, Eagles Park, Kleinman Park, and Sherwood Park use named OpenStreetMap park geometry points cross-checked against the current City address and City park boundary. Their current City page pins fall outside the City boundary and remain recorded as conflicting evidence for recheck.
- Hohokam Stadium was reviewed and excluded. Although the older City dataset labels it as type `Park`, the current City identity is a staffed spring-training stadium, not a general public-park parent for this packet.

## Authoritative Sources Checked

- Current City parks and facilities directory: https://www.mesaaz.gov/Activities-Culture/Parks-Recreation-and-Community-Facilities/Parks-Facilities
- City Parks Locations and Amenities dataset: https://data.mesaaz.gov/Parks-Recreation-and-Community-Facilities/Parks-Locations-And-Amenities/djym-pkpp
- City park-boundary service: https://gis.mesaaz.gov/mesaaz/rest/services/Parks/ParkViewer/MapServer/0
- City policies, copyright, data, and map terms: https://www.mesaaz.gov/Government/ADA-Policies-Disclaimer
- Named OSM geometry used for the four resolved pin conflicts: https://www.openstreetmap.org/relation/11790087, https://www.openstreetmap.org/way/853979558, https://www.openstreetmap.org/way/1120482076, and https://www.openstreetmap.org/way/1408452333

Every record also stores its exact current City facility URL and stable `PKPK` data row URL.

## Image Rights And Data Terms

No image file was downloaded or imported. Mesa states that City website content is governed by CC BY-NC-SA 3.0 US while separately copyrighted material requires permission. AuditMap does not assume that the noncommercial license permits its reuse, so City page images remain unavailable for publication without a separate permission decision.

Mesa's map terms prohibit redistribution without written authorization. The boundary layer was used only to verify points and detect conflicts; no polygon geometry was copied into the repository. Annual open-data attributes are retained as source metadata and are not presented as current operating facts.

## Publication Gates

All 25 parents still need separately assigned launch-guide work: current recurring visitor answers, representative reusable photography, and final operator rechecks. The four coordinate conflicts also need a final City-page pin recheck before navigation is published.

## Verification

- `npm run verify:mesa:research` passed.
- `npm run refresh:national-coverage` completed with 3,418 known destinations, 3,382 live pages, and 36 hopper records.
- `npm run test:national-coverage` passed.
- `npm run release:enrichment:check` passed all 55 campaign verifiers, national discovery, and the North Carolina image-rights and generated-page safeguards.
- All 25 current facility pages returned HTTP 200 with the expected current heading. The City data, boundary, terms, and four OSM source endpoints also returned successfully: 32 endpoints checked.
- JSON parsing, JavaScript syntax, and whitespace checks passed.
- The packet generated no Mesa page, route, image, or mobile/desktop preview surface. Shared HTML generated during the release test was restored; the unrelated generated Miami folder was preserved at `/tmp/auditmap-mesa-generated-side-effect-maurice-a-ferr-park`.

No secrets, paid APIs, dependencies, private visitor data, precise visitor-location logs, generated pages, live database writes, deployment, merge, or production promotion were introduced.
