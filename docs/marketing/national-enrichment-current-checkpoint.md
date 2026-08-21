# National Enrichment Current Checkpoint

Last updated: 2026-08-20

## Current State

- Status: the exact 25-parent Mesa catalogue-breadth packet is source-complete at inventory tier and remains image- and launch-guide-gated. The prior Boise release remains generated, release-verified, responsive-layout-verified, and hosted-preview-verified with all 55 campaign verifiers passing.
- Working branch: `codex/mesa-parks-discovery`, stacked on the submitted Boone, Raleigh, Fayetteville, Concord, Asheville, and Greensboro packets and the national registry follow-on to `codex/boise-evidence-gate`
- Assignment: OpenTask project `https://opentask.ai/projects/cms6chmlu0003l204mn6qvfw6`, GitHub issue #49, packet `research-completion-az-mesa-01`
- Outcome: 25 City of Mesa park parents now have current canonical identities, stable municipal IDs, reviewed coordinates, source labels, checked dates, freshness classifications, and `needs-launch-guide` release-ledger states.
- Identity and coordinate decisions: Monterey Park is retained as an alias for Christopher J. Brady Park. Fitch, Eagles, Kleinman, and Sherwood use named OpenStreetMap park geometry after the current City page pins failed the City-boundary check; Hohokam Stadium is excluded from this general-park packet.
- Publication decision: no Mesa parent or destination page is generated and no City image is imported. City boundaries were used only for verification because Mesa's map terms prohibit redistribution.
- Submission: draft PR #50; not merged or promoted to production.
- Canonical machine-readable checkpoint: `data/us-priority-enrichment-queue.json` under `activeCluster.resumeCheckpoint`.

The Cleveland-through-Boise batches and the submitted Greensboro-through-Boone inventory packets remain complete at their previous checkpoints. The Mesa inventory packet does not change their evidence decisions or reopen retired destinations.

## Resume Point

Do not repeat completed batches unless review finds a specific defect or new evidence changes a deferred decision. On this stacked line, Chesapeake Bay, Greensboro through Boone, and Mesa are reserved as submitted work. Review Mesa draft PR #50 before refreshing and selecting the next exact packet.

The Fayetteville claim is submitted in PR #44. If review requests changes, change it to `changes-requested`; if accepted, retain Arnette Park at inventory tier until current operator hours, four varied representative reusable photographs, and the complete recurring visitor-answer set justify a separate launch-guide assignment. The Raleigh claim is submitted in PR #46; keep it at inventory tier until representative reusable photographs and the separately assigned complete launch-guide profile clear review. The Boone claim is submitted in PR #48; keep all three parents at inventory tier until their named hours, image, and launch-guide gates clear.

Keep the Azalea Park access conflict open. Recheck the City structured location record, normal visitor page, current recovery project, and an explicit operator area-status source before publishing hours or arrival guidance. Keep Azalea Dog Park as a related facility rather than duplicating or substituting it for the parent.

Keep Marvin Caldwell Park's source classes separate. The July 2026 reopening notice controls current access and hours; the general park directory is legacy amenity evidence, and the Council/design and construction records do not by themselves prove a complete current as-built inventory. Recheck the splash-pad season and named-facility schedules before visitor publication.

Keep Arnette Park's resolved address classes separate. The current visitor address is 2165 Wilmington Highway, Fayetteville, NC 28306; the park parcel's 2161 situs is property context, and the legacy Old Wilmington Highway / 28301 form is not a public entrance. Obtain current operator hours and recheck GIS amenities before visitor publication; do not present the funded trail extension as open.

Keep Spring Forest Road Park distinct from Millbrook Exchange Park. Use 4203 Spring Forest Road and the official existing vehicle entrance AP_ID `Spring Forest Road - 004`; retain the three pedestrian entrances as access context. Do not generalize the tennis-court lighting statement to every park use, and do not reuse City photographs without a documented permission basis.

Keep the Boone evidence classes separate. Use the current Town facility pins for Clawson-Burnley and Daniel Boone Parks; preserve Boone Jaycee Park as Daniel Boone Park's child. Use 135 Bear Trail for Junaluska inventory and retain the 175 Summit residential pin as a conflict, not navigation. Do not claim 2023 ADA-plan remedies are complete or reuse all-rights-reserved Town photographs.

Keep the Mesa source classes separate. Current City facility pages control identity and address; the 2024 annual dataset supplies stable IDs and cross-check metadata but not current operating facts. Retain Monterey Park as a Christopher J. Brady Park alias. Recheck the Fitch, Eagles, Kleinman, and Sherwood page-pin conflicts before launch-guide navigation. Do not redistribute City GIS geometry or reuse City images under a noncommercial license without a separate permission decision.

Keep Barber and Hester Parks in the deferred-photo queue until each has four varied representative permission-cleared views. Keep T.Y. Park, Tree Tops Park, and Vista View Park in the deferred-photo queue until each has three to four representative permission-cleared views. Keep Olbrich Park in review until at least two additional representative reusable park views are available. Riverside Park in Grand Rapids remains parent-only until a destination-specific photo, exact pin, and current destination profile clear together. North Point State Park's conflicting official opening times and visitor-center schedules, Crystal Pier damage, Trolley Station Pavilion renovation, seasonal Sandy Point reservations and swimming operations, Key Bridge routing, seasonal Millennium beach and splashpad operations, Riverside kayaking and flooding, North Point Lighthouse schedules, Vilas beach conditions, Madison restroom closures, Castaway Island's seasonal schedule, Vista View capital projects, Josephine Fountain operation, and Rockford Tower access remain freshness risks requiring operator rechecks.

Continue requiring representative reusable photography, current official visitor guidance, exact destination coordinates, and destination-specific photographic evidence before publishing any parent or destination page. Defer weak subsites rather than publishing broad parent images or approximate pins.

## Efficient Operating Model

- Refresh from the latest stacked campaign head and claim one exact generated packet before research begins.
- Keep one packet and one reviewable outcome per pull request; do not use a target park count to override evidence quality or packet boundaries.
- Apply the assigned contribution tier. Inventory packets do not become launch guides merely because current visitor facts are available.
- For page-producing packets, generate and test locally throughout the batch, then create one pull request preview for the release candidate.
- Keep one authoritative campaign record per place and regenerate derived HTML rather than hand-editing generated pages.
- Preserve the quality bar: useful source-backed answers, licensed real images, exact subsite positions, and no filler.

## Required Resume Checks

For research-only packets, validate source JSON, exact registry state, claim state, checked URLs, image-rights findings, and the unresolved queue; page-layout and optimized-image checks are not applicable when no page changes. For page-producing packets, run the campaign generator and verification suite plus national discovery and North Carolina safeguards, then verify raw HTML, canonical metadata, image rendering, redirects, and 390-pixel layout on the Vercel preview.

The long-running nationwide rollout remains active. This checkpoint marks a deliberate batch boundary, not completion of the overall goal.
