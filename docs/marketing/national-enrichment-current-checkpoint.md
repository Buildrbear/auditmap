# National Enrichment Current Checkpoint

Last updated: 2026-08-20

## Current State

- Status: the exact Greensboro research-completion packet is source-complete and remains launch-guide-photo-gated. The prior Boise release remains generated, release-verified, responsive-layout-verified, and hosted-preview-verified with all 55 campaign verifiers passing.
- Working branch: `codex/greensboro-research-completion`, stacked on the national registry and claim-ledger follow-on to `codex/boise-evidence-gate`
- Assignment: OpenTask project `https://opentask.ai/projects/cms6chmlu0003l204mn6qvfw6`, GitHub issue #37, packet `research-completion-nc-greensboro-01`
- Outcome: Jimmie I. Barber Park and Oka T. Hester Park now have stable inventory identities, aliases, current official sources, municipal address-point coordinates, checked dates, and explicit image and visitor-answer review queues. Hester's address question is resolved: 3615 Deutzia Street is the canonical park-office address and 800 Ailanthus Street is the athletic-fields entrance.
- Publication decision: no Greensboro parent or destination page is generated. Eight Openverse queries and Wikimedia Commons review produced no representative reusable parent set; public City-page images were not treated as reuse permission.
- Production status: not merged or promoted to production.
- Canonical machine-readable checkpoint: `data/us-priority-enrichment-queue.json` under `activeCluster.resumeCheckpoint`.

The Cleveland, Detroit, Columbus, Cincinnati, Indianapolis, Upper Midwest, inland Broward, Miami, Tampa Bay, Philadelphia, Pittsburgh, Anchorage, Wilmington, Chesapeake Bay, and Boise batches remain complete at their previous checkpoints. The Greensboro inventory packet does not change their evidence decisions or reopen their retired destinations.

## Resume Point

Do not repeat completed batches unless review finds a specific defect or new evidence changes a deferred decision. The corrected registry generated from the latest Boise campaign head contains six open research-completion packets; the two generated Chesapeake Bay parents are reserved as submitted work instead of being offered again.

After review, change the Greensboro claim from `claimed` to `submitted`, `changes-requested`, or `released`; never leave it ambiguous. If accepted, retain both records at inventory tier until representative reusable media and the complete recurring visitor-answer set justify a separate launch-guide assignment. Then claim one remaining exact research packet from the generated queue.

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
