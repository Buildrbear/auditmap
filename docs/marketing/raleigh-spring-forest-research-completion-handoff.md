# Raleigh Spring Forest Road Park Research-Completion Handoff

## Assignment

- Packet: `research-completion-nc-raleigh-01`
- Scope: Spring Forest Road Park, Raleigh, North Carolina
- OpenTask assignment: https://opentask.ai/projects/cms6chmlu0003l204mn6qvfw6
- GitHub issue: https://github.com/Buildrbear/auditmap/issues/45
- Checked: 2026-08-20
- Contribution tier: inventory
- Production publication: not performed

## Outcome

Spring Forest Road Park now has a source-complete inventory identity, current visitor address, official municipal vehicle-entrance coordinate, reviewed position quality, current access and general-hours evidence, image-rights findings, and an explicit unresolved queue.

The former duplicate flag is resolved. The current City park page and directory place Spring Forest Road Park at 4203 Spring Forest Road. The same current directory separately places Millbrook Exchange Park at 1905 Spring Forest Road. These are distinct City parks, and Millbrook's address must not be attached to Spring Forest Road Park.

The Citywide park rule is dawn to dusk unless otherwise posted. The park-specific statement that tennis-court lighting operates from dusk to 10 p.m. is retained as facility-specific guidance, not a blanket extension of every park use. No page was generated.

## Accepted Record

- `/us/nc/raleigh/parks/spring-forest-road-park`

Files changed for this packet include the North Carolina source intake, external-source override record, spatial-source registry, packet campaign and audit, photo-research result, national checkpoint and queue, claim ledger, verifier, and this handoff.

## Official Sources Checked

- Current City park page: https://raleighnc.gov/parks-and-recreation/places/spring-forest-road-park
- Citywide park rules and hours: https://raleighnc.gov/parks-and-recreation/services/find-community-center/know-you-go
- City parks directory, Spring Forest Road Park: https://raleighnc.gov/parks-directory/s
- City parks directory, Millbrook Exchange Park: https://raleighnc.gov/parks-directory/m
- City Park Access Points GIS item: https://www.arcgis.com/home/item.html?id=f8e7dd082f584629885e2ae0715e4d24
- City Park Access Points feature service: https://services.arcgis.com/v400IkDOw1ad7Yad/arcgis/rest/services/PRCR_Park_Access_Points/FeatureServer/0
- City web legal notices: https://raleighnc.gov/engage-city/services/web-legal-notices
- City Parks Media page: https://raleighnc.gov/parks-and-recreation/services/parks-media

The public ArcGIS service returned four official existing park access points for Spring Forest Road: one vehicle entrance and three pedestrian entrances.

## Identity, Address, And Coordinate Decisions

- Canonical name: Spring Forest Road Park.
- Reviewed alias: Spring Forest Park, used by the current City drone-guidance page.
- Canonical visitor address: 4203 Spring Forest Road, Raleigh, NC 27616.
- Parent navigation coordinate: `35.8580681274815, -78.5713910990543`.
- Coordinate provenance: City Park Access Points OBJECTID 202 / AP_ID `Spring Forest Road - 004`, classified Vehicle, Official, Park, Existing Yes.
- Position quality: `reviewed-official-vehicle-entrance`.
- The three official pedestrian access points remain access context, not separate parents.
- The earlier general address-geocoder point is superseded for navigation by the current official vehicle entrance.
- Millbrook Exchange Park at 1905 Spring Forest Road is a distinct parent and not an alias, entrance, or duplicate.

## Current Use And Relationships

- The City park page was updated July 15, 2026 and lists 21.8 acres, a 0.47-mile walking trail, large open space, reservable shelter and comfort station, tennis courts, a lighted field, and a playground.
- The linked Citywide rule is dawn to dusk unless otherwise posted; leashed dogs are welcome when waste is removed.
- Tennis-court push-button lighting is listed from dusk to 10 p.m. and remains facility-specific.
- The shelter, comfort station, courts, field, open space, trail, and playground are facilities inside the parent. This inventory packet creates no standalone destination pages.

## Image Rights Review

- Four Openverse queries: zero reusable candidates.
- Wikimedia Commons exact-name and ten-kilometer geosearch: no representative exact-destination photograph was accepted.
- The City page displays exact-location photographs, but the current City legal notice prohibits commercial use without written permission to the extent allowed by law. The Parks Media library link does not establish AuditMap reuse permission for those exact images.
- No proprietary listing, review-site, search-result, or AI-generated image was accepted.

## Unresolved Review Queue

| Place | Field or feature | Conflict or missing evidence | Sources checked | Recommended next action |
| --- | --- | --- | --- | --- |
| Spring Forest Road Park | Parent photography | No representative reusable four-photo parent set; exact City photographs lack a documented AuditMap reuse basis | Openverse, Wikimedia Commons, City park/media/legal pages | Obtain four varied current reusable views or written City permission. |
| Spring Forest Road Park | Launch-guide visitor profile | The inventory is resolved, but the complete current parking, transit, accessible-route, no-cost-access, alert, weather, and facility-availability answer set has not been assembled | Current City pages and municipal GIS | Complete under a separately claimed launch-guide packet after the photo gate clears. |

## Risks And Publication

The primary identity risk is reattaching Millbrook Exchange Park's 1905 address. The primary navigation risk is reverting to a generic address point instead of the official vehicle entrance. The primary freshness risks are generalizing the 10 p.m. court-lighting statement, or carrying current rental, facility, alert, and rule details forward without recheck. City hosting and the media-library link do not grant image reuse rights by themselves.

No secrets, private visitor data, precise visitor-location logs, paid APIs, dependencies, generated pages, live database writes, deployment, merge, or production promotion were introduced.
