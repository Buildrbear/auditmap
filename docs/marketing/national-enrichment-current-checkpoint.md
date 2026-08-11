# National Enrichment Current Checkpoint

Last updated: 2026-08-11

## Current State

- Status: the Wilmington evidence-gate batch is generated and locally release-verified; all 53 national enrichment campaign verifiers pass with zero failures.
- Working branch: `codex/wilmington-evidence-gate`
- Pull request: pending stacked draft on PR #29
- Outcome: Brandywine Park and Rockford Park clear the four-photo parent gate; Josephine Fountain and Rockford Tower clear exact destination review. Brandywine Zoo returns to parent guidance until a current representative reusable destination photograph clears rights review.
- Preview: pending pull-request deployment and optimized-image verification.
- Production status: not merged or promoted to production.
- Canonical machine-readable checkpoint: `data/us-priority-enrichment-queue.json` under `activeCluster.resumeCheckpoint`.

The Cleveland, Detroit, Columbus, Cincinnati, Indianapolis, Upper Midwest, inland Broward, Miami, Tampa Bay, Philadelphia, Pittsburgh, and Anchorage batches remain complete at their previous checkpoints. Wilmington adds a new connected launch batch without changing their evidence decisions.

## Resume Point

Do not repeat completed batches unless review finds a specific defect or new evidence changes a deferred decision. Wilmington's two parent routes and two exact destination routes pass the source, photography, position, profile, raw-HTML, and nationwide regression gates. The full release check preserved all 53 campaign decisions and passed national discovery plus North Carolina image and generated-page safeguards.

After maintainer review of Wilmington's stacked draft, open the next connected high-impact metro cluster only where current official visitor sources and representative reusable media support a reviewable batch. Continue the same four-photo parent gate and exact-photo, exact-position, destination-specific-profile gate. Keep Brandywine Zoo, Far North Bicentennial Park, Julian B. Lane, Boyd Hill, inland Broward, Olbrich Park, Riverside Regional Park, and Broad Ripple Park deferred until their documented media gaps are resolved.

Keep T.Y. Park, Tree Tops Park, and Vista View Park in the deferred-photo queue until each has three to four representative permission-cleared views. Keep Olbrich Park in review until at least two additional representative reusable park views are available. Riverside Park in Grand Rapids remains parent-only until a destination-specific photo, exact pin, and current destination profile clear together. Seasonal Millennium beach and splashpad operations, Riverside kayaking and flooding, North Point Lighthouse schedules, Vilas beach conditions, Madison restroom closures, Castaway Island's seasonal schedule, Vista View capital projects, Josephine Fountain operation, and Rockford Tower access remain freshness risks requiring operator rechecks.

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
