# Boone Public Parks Research-Completion Handoff

## Assignment

- Packet: `research-completion-nc-boone-01`
- Scope: Clawson-Burnley Park, Daniel Boone Park, and Junaluska Park, Boone, North Carolina
- OpenTask assignment: https://opentask.ai/projects/cms6chmlu0003l204mn6qvfw6
- GitHub issue: https://github.com/Buildrbear/auditmap/issues/47
- Checked: 2026-08-20
- Contribution tier: inventory
- Production publication: not performed

## Outcome

All three Boone records now have reviewed source-format identities, current visitor addresses, coordinate provenance, current-use evidence, relationship or address decisions, image-rights findings, and explicit review queues.

- Clawson-Burnley Park now uses the current Town facility-directory map pin, cross-checked against the named Town GIS park structures and intersecting Town-owned parcel. This resolves the former street-only geocoder concern.
- Daniel Boone Park remains the 36.5-acre parent. The Town expressly identifies Boone Jaycee Park as its child facility; the child must not be counted as another major parent or supply hours for the whole campus.
- Junaluska Park uses the current 135 Bear Trail address and its reviewed address point, which falls inside the Town GIS 135 Bear Trail structure. The facility page still embeds a pin at the 175 Summit Street residential structure used by the 2023 ADA plan, so that pin remains conflicting legacy evidence rather than a public entrance.

No page was generated.

## Accepted Records

- `/us/nc/boone/parks/clawson-burnley-park`
- `/us/nc/boone/parks/daniel-boone-park`
- `/us/nc/boone/parks/junaluska-park`

## Official Sources Checked

- Clawson-Burnley Park: https://www.townofboone.net/facilities/facility/details/ClawsonBurnley-Park-13
- Greenway Trail: https://townofboone.net/Facilities/Facility/Details/Greenway-Trail-27
- Town wetlands page: https://www.townofboone.net/662/Wetlands
- Daniel Boone Park: https://www.townofboone.net/Facilities/Facility/Details/Daniel-Boone-Park-1
- Boone Jaycee Park: https://www.townofboone.net/Facilities/Facility/Details/Boone-Jaycee-Park-12
- May 2026 park-tour meeting: https://www.townofboone.net/calendar.aspx?EID=3186&PREVIEW=YES
- Junaluska Park: https://www.townofboone.net/facilities/facility/details/junaluskapark-15
- 2023 ADA Transition Plan: https://www.townofboone.net/DocumentCenter/View/2432/ADA-Transition-Plan-Updated-March-17-2023-PDF
- Town GIS Structure Address Labels: https://gisviewer.boonenc.gov/arcgis/rest/services/gisviewer/MasterV2/MapServer/16
- Town/Watauga parcel GIS: https://gisviewer.boonenc.gov/arcgis/rest/services/gisviewer/Parcels/MapServer/1
- Town copyright notice: https://www.townofboone.net/copyright

## Coordinate And Relationship Decisions

| Parent | Reviewed coordinate | Position quality | Decision |
| --- | --- | --- | --- |
| Clawson-Burnley Park | `36.2048775699029, -81.6507230115573` | `reviewed-official-facility-map-pin` | Current Town facility pin; named Town GIS structures at 355 Martin Luther King Jr Street and Town-owned parcel cross-check it. |
| Daniel Boone Park | `36.2095879885407, -81.669921000333` | `reviewed-official-facility-map-pin` | Current Town facility pin on the Town-owned campus parcel near the 591 Horn in the West office structure. Boone Jaycee Park remains a child. |
| Junaluska Park | `36.2224624, -81.6809793` | `reviewed-current-address-building-match` | Current 135 Bear Trail address point validated inside the Town GIS structure. The embedded 175 Summit pin is retained as a conflict, not navigation. |

## Current Access And Freshness

- Current Town facility records and 2026 Clawson-Burnley interpretive work and Daniel Boone park-tour evidence establish active public use.
- No current general hours were found for Clawson-Burnley, Daniel Boone Park as a whole, or Junaluska Park.
- Boone Jaycee Park's dawn-to-dusk schedule applies to that child facility only.
- Junaluska's 2023 ADA plan reports barriers and planned remedies based on 2020 inspections. It does not establish that every remedy is complete in 2026.

## Image Rights Review

- Twelve Openverse queries produced zero accepted images.
- Clawson-Burnley and Junaluska returned no candidates. Daniel Boone returned one wrong park and eleven near-duplicate insect close-ups from the Native Gardens child attraction; none represent the parent campus.
- Wikimedia Commons exact-name and ten-kilometer searches produced no representative exact-parent set.
- The Town copyright page states that Boone site content is all-rights-reserved; no Town image was imported.

## Unresolved Review Queue

| Place | Missing evidence | Next action |
| --- | --- | --- |
| Clawson-Burnley Park | Current general hours and four varied reusable parent photographs | Obtain operator hours and a permission-cleared representative set. |
| Daniel Boone Park | Parent-campus hours, attraction-specific schedules, and representative parent photography | Verify each operator and obtain four varied parent views; do not inherit Jaycee hours. |
| Junaluska Park | Town correction or explanation of the 175 Summit pin, current hours, current accessible-route status, and representative parent photography | Reconcile with the Town and obtain new operational and image evidence. |

## Risks And Publication

Do not revert Clawson-Burnley to the former street-only point, double-count Boone Jaycee Park, apply its hours across Daniel Boone Park, present 175 Summit Street as a Junaluska entrance, or claim planned ADA work is complete. Town hosting does not grant media reuse rights.

No secrets, private visitor data, precise visitor-location logs, paid APIs, dependencies, generated pages, live database writes, deployment, merge, or production promotion were introduced.
