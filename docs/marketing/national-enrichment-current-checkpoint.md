# National Enrichment Current Checkpoint

Last updated: 2026-08-11

## Current State

- Status: the Anchorage evidence-gate batch is generated and locally verified; all 52 national enrichment campaign verifiers pass with zero failures.
- Working branch: `codex/anchorage-evidence-gate`
- Pull request: pending draft creation, stacked on PR #28
- Outcome: Kincaid Park and Delaney Park Strip clear the four-photo parent gate; Kincaid Beach, Centennial Rose Garden, and Alaska Railroad No. 556 clear exact destination review. Far North Bicentennial Park remains explicitly photo-gated with two reviewed images.
- Preview: pending draft deployment; six retained routes pass local 390-pixel checks and all three parents pass 1440-pixel checks without horizontal overflow.
- Production status: not merged or promoted to production.
- Canonical machine-readable checkpoint: `data/us-priority-enrichment-queue.json` under `activeCluster.resumeCheckpoint`.

The Cleveland, Detroit, Columbus, Cincinnati, Indianapolis, Upper Midwest, inland Broward, Miami, Tampa Bay, Philadelphia, and Pittsburgh batches remain complete at their previous checkpoints. Anchorage adds a new connected launch batch without changing their evidence decisions.

## Resume Point

Do not repeat completed batches unless review finds a specific defect or new evidence changes a deferred decision. Anchorage's six retained routes passed local 390-pixel checks, all three parents passed 1440-pixel checks, and no horizontal overflow was observed. A clean full generation preserved the reviewed galleries, answer sets, destination sets, and Far North deferral. Preview route and optimized-image validation remains pending.

After maintainer review of Anchorage's stacked draft, open the next connected high-impact metro cluster only where current official visitor sources and representative reusable media support a reviewable batch. Continue the same four-photo parent gate and exact-photo, exact-position, destination-specific-profile gate. Keep Far North Bicentennial Park, Julian B. Lane, Boyd Hill, inland Broward, Olbrich Park, Riverside Regional Park, and Broad Ripple Park deferred until their documented media gaps are resolved.

Keep T.Y. Park, Tree Tops Park, and Vista View Park in the deferred-photo queue until each has three to four representative permission-cleared views. Keep Olbrich Park in review until at least two additional representative reusable park views are available. Riverside Park in Grand Rapids remains parent-only until a destination-specific photo, exact pin, and current destination profile clear together. Seasonal Millennium beach/splashpad operations, Riverside kayaking and flooding, North Point Lighthouse schedules, Vilas beach conditions, Madison restroom closures, Castaway Island's seasonal schedule, and Vista View capital projects remain freshness risks requiring operator rechecks.

Continue requiring representative reusable photography, current official visitor guidance, exact destination coordinates, and destination-specific photographic evidence before publishing any parent or destination page. Defer weak subsites rather than publishing broad parent images or approximate pins.

## Efficient Operating Model

- Research and prepare one geographic cluster at a time.
- Batch approximately 10 to 25 parent parks into one review, generation, verification, and preview cycle when evidence availability supports it.
- Do not deploy or preview per park. Generate and test locally throughout the batch, then create one pull request preview for the release candidate.
- Keep one authoritative campaign record per place and regenerate derived HTML rather than hand-editing generated pages.
- Preserve the quality bar: useful source-backed answers, licensed real images, exact subsite positions, and no filler.

## Required Resume Checks

Run the campaign generator and verification suite appropriate to the chosen cluster, plus national discovery and North Carolina regression safeguards. Verify raw HTML, canonical metadata, image rendering on the Vercel preview, redirects, and 390-pixel mobile layout before requesting publication.

The long-running nationwide rollout remains active. This checkpoint marks a deliberate batch boundary, not completion of the overall goal.
