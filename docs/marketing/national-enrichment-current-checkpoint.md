# National Enrichment Current Checkpoint

Last updated: 2026-08-21

## Current State

- Status: cumulative release PR #66 is merged and production deployment `dpl_2TR9WyKyLdn3VRG5oJWMMAbnJryw` is Ready on `auditmap.org`. The dependent PR stack is closed as superseded; independent validator PR #3 remains open.
- Working branch: `codex/national-production-reconciliation`, based on production merge commit `59d2f4ce338bef932c1fe23e9bc1f4dadcf428a7`.
- Assignment: production reconciliation for the accepted nationwide stack, including claim closure, sitemap synchronization, legacy-route cleanup, and capacity reopening.
- Outcome: the complete verified enrichment stack through historical San Diego verifier maintenance is on `main`. Cleveland Lakefront Nature Preserve, Rocky River Reservation, and Brecksville Reservation plus their four exact destination pages are live, indexed, image-verified, and overflow-free at 390 pixels.
- Production verification: all seven Cleveland routes return HTTP 200; the canonical host redirect is permanent; hero images render through Vercel's optimizer; browser console checks are clean; and the three Atlanta legacy-name routes permanently redirect to `/eastside-trail`, `/chastain-park`, and `/westside-park`.
- Registry synchronization: the refreshed sitemap adds the ten production-serving Anchorage, Wilmington, White River, and Philadelphia destination pages that were omitted from the previous sitemap, removes 91 retired legacy destination URLs already covered by campaign redirects, and removes three obsolete Atlanta static files. All 15 submitted claims close as `accepted` against merged PR #66 while their original submission URLs remain retained.
- Machine-readable capacity: `data/us-priority-enrichment-queue.json` now records two available municipality-breadth lanes and one available depth lane. No campaign lane remains reserved by the released stack.
- Canonical machine-readable checkpoint: `data/us-priority-enrichment-queue.json` under `activeCluster.resumeCheckpoint`.

The Cleveland-through-Boise batches and the accepted Greensboro-through-Boone, Mesa, and El Paso inventory packets remain complete at their previous evidence tiers. Acceptance does not upgrade inventory-only records to launch guides or reopen retired destinations.

## Resume Point

Do not repeat completed batches unless review finds a specific defect or new evidence changes a deferred decision. Start the next campaign work only from a newly claimed generated packet. Two municipality-breadth lanes and one depth lane are available; every new lane still requires one exact packet, one reviewable outcome, and the stable claim contract.

Keep White River State Park's two published destination classes exact. Celebration Plaza Amphitheater is not a substitute for the separate Celebration Plaza lawn. Canal Walk's navigation pin is the named paved segment inside the parent park, not the geometric center of the full three-mile loop. Treat the operator's displayed August 15 closure notice as expired because it explicitly says reopening August 16, and recheck current alerts and events on the day of a visit. Do not inherit the park's 5:00 a.m.-11:00 p.m. grounds schedule to museums, the zoo, rentals, concerts or ticketed events.

The Fayetteville, Raleigh, and Boone claims are accepted at inventory tier. Retain Arnette Park at inventory tier until current operator hours, four varied representative reusable photographs, and the complete recurring visitor-answer set justify a separately assigned launch guide. Keep Spring Forest Road Park at inventory tier until representative reusable photographs and a separately assigned complete launch-guide profile clear review. Keep all three Boone parents at inventory tier until their named hours, image, and launch-guide gates clear.

Keep the Azalea Park access conflict open. Recheck the City structured location record, normal visitor page, current recovery project, and an explicit operator area-status source before publishing hours or arrival guidance. Keep Azalea Dog Park as a related facility rather than duplicating or substituting it for the parent.

Keep Marvin Caldwell Park's source classes separate. The July 2026 reopening notice controls current access and hours; the general park directory is legacy amenity evidence, and the Council/design and construction records do not by themselves prove a complete current as-built inventory. Recheck the splash-pad season and named-facility schedules before visitor publication.

Keep Arnette Park's resolved address classes separate. The current visitor address is 2165 Wilmington Highway, Fayetteville, NC 28306; the park parcel's 2161 situs is property context, and the legacy Old Wilmington Highway / 28301 form is not a public entrance. Obtain current operator hours and recheck GIS amenities before visitor publication; do not present the funded trail extension as open.

Keep Spring Forest Road Park distinct from Millbrook Exchange Park. Use 4203 Spring Forest Road and the official existing vehicle entrance AP_ID `Spring Forest Road - 004`; retain the three pedestrian entrances as access context. Do not generalize the tennis-court lighting statement to every park use, and do not reuse City photographs without a documented permission basis.

Keep the Boone evidence classes separate. Use the current Town facility pins for Clawson-Burnley and Daniel Boone Parks; preserve Boone Jaycee Park as Daniel Boone Park's child. Use 135 Bear Trail for Junaluska inventory and retain the 175 Summit residential pin as a conflict, not navigation. Do not claim 2023 ADA-plan remedies are complete or reuse all-rights-reserved Town photographs.

Keep the Mesa source classes separate. Current City facility pages control identity and address; the 2024 annual dataset supplies stable IDs and cross-check metadata but not current operating facts. Retain Monterey Park as a Christopher J. Brady Park alias. Recheck the Fitch, Eagles, Kleinman, and Sherwood page-pin conflicts before launch-guide navigation. Do not redistribute City GIS geometry or reuse City images under a noncommercial license without a separate permission decision.

Keep the El Paso source classes separate. The current City Parks page establishes operator scope; the live Parks FeatureServer supplies City ownership/category, address, acreage, stable GlobalID, and an approximate representative point. Do not present a polygon centroid as an entrance. Resolve Eastside Regional Park's `Hueco Club` address, Blackie Chesher Park's dual address, and both linear parks' practical arrival segments before navigation. Do not redistribute City polygon geometry or reuse all-rights-reserved City imagery.

Keep Barber and Hester Parks in the deferred-photo queue until each has four varied representative permission-cleared views. Keep T.Y. Park, Tree Tops Park, and Vista View Park in the deferred-photo queue until each has three to four representative permission-cleared views. Keep Olbrich Park in review until at least two additional representative reusable park views are available. Riverside Park in Grand Rapids remains parent-only until a destination-specific photo, exact pin, and current destination profile clear together. North Point State Park's conflicting official opening times and visitor-center schedules, Crystal Pier damage, Trolley Station Pavilion renovation, seasonal Sandy Point reservations and swimming operations, Key Bridge routing, seasonal Millennium beach and splashpad operations, Riverside kayaking and flooding, North Point Lighthouse schedules, Vilas beach conditions, Madison restroom closures, Castaway Island's seasonal schedule, Vista View capital projects, Josephine Fountain operation, and Rockford Tower access remain freshness risks requiring operator rechecks.

Continue requiring representative reusable photography, current official visitor guidance, exact destination coordinates, and destination-specific photographic evidence before publishing any parent or destination page. Defer weak subsites rather than publishing broad parent images or approximate pins.

## Efficient Operating Model

- Refresh from the latest stacked campaign head and claim one exact generated packet before research begins.
- Interpret registry `asOf`, freshness and claim-expiration dates in `America/New_York`; UTC midnight must not advance the campaign date during the Eastern evening.
- Keep at most two open municipality-breadth batches and one depth cluster. Mesa and El Paso fill the two breadth slots at this checkpoint.
- Keep machine-readable lane counts synchronized with independent review outcomes before refreshing or assigning packets; a zero-availability breadth lane removes research-completion packets from the claimable table.
- Order the generated OpenTask queue by the hopper threshold: release reconciliation first above 100 records, evidence completion first at or below 100, without bypassing WIP caps.
- Keep one packet and one reviewable outcome per pull request; do not use a target park count to override evidence quality or packet boundaries.
- Keep every `acceptedRecordIds` entry inside its exact claimed packet. The deterministic refresh rejects malformed paths, duplicates and cross-packet record references for active claims.
- Keep every registry path and ID globally unique. The refresh rejects ambiguous research identities that would reuse a live canonical route and separate research records that normalize to one route; resolve the source identity or slug instead of emitting duplicate keys.
- Keep claim documents on schema version 1 with no undeclared fields. Review queues use structured issue/recommendation objects, with optional HTTPS source URLs; the current ledger contains 15 valid claims and 37 structured review items.
- Apply the assigned contribution tier. Inventory packets do not become launch guides merely because current visitor facts are available.
- For page-producing packets, generate and test locally throughout the batch, then create one pull request preview for the release candidate.
- Keep one authoritative campaign record per place and regenerate derived HTML rather than hand-editing generated pages.
- Preserve the quality bar: useful source-backed answers, licensed real images, exact subsite positions, and no filler.

## Required Resume Checks

For research-only packets, validate source JSON, exact registry state, claim state, checked URLs, image-rights findings, and the unresolved queue; page-layout and optimized-image checks are not applicable when no page changes. For page-producing packets, run the campaign generator and verification suite plus national discovery and North Carolina safeguards, then verify raw HTML, canonical metadata, image rendering, redirects, and 390-pixel layout on the Vercel preview.

The long-running nationwide rollout remains active. This checkpoint marks a deliberate batch boundary, not completion of the overall goal.
