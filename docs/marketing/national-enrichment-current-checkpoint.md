# National Enrichment Current Checkpoint

Last updated: 2026-08-11

## Current State

- Status: the Tampa Bay evidence-gate rebuild is generated, locally verified, and deployed to a protected Ready preview; authenticated response and screenshot verification remains blocked.
- Working branch: `codex/tampa-bay-evidence-gate`
- Pull request: https://github.com/Buildrbear/auditmap/pull/26 (draft, stacked on PR #25)
- Outcome: six released parent guides, two explicit photo-gated parents, 27 reviewed reusable images, three evidence-complete destinations, and 61 retired legacy routes.
- Preview: https://auditmap-pipqwud6a-derrys-projects-f5a18cb6.vercel.app (Ready at commit `2424e4f`; Vercel Authentication blocks route/image/redirect response checks in the available browser session).
- Production status: not merged or promoted to production.
- Canonical machine-readable checkpoint: `data/us-priority-enrichment-queue.json` under `activeCluster.resumeCheckpoint`.

The Cleveland, Detroit, Columbus, Cincinnati, Indianapolis, Upper Midwest, inland Broward, and Miami batches remain complete at their previous checkpoints. Tampa Bay now retains exact destination pages only for Tampa Bay Watch Discovery Center, Historic Fort De Soto, and Fort De Soto Gulf Pier. Curtis Hixon, Lettuce Lake, Ballast Point, and Vinoy Park are parent-only; Julian B. Lane and Boyd Hill remain photo-gated below release threshold.

## Resume Point

Do not repeat the completed Tampa Bay, Miami, Midwest, or inland Broward batches unless review finds a specific defect or new evidence changes a deferred decision. Tampa Bay's 11 retained routes passed local 390-pixel checks, all eight parents passed 1440-pixel checks, and no horizontal overflow or browser warning/error was observed. The broad generator's unrelated drift was discarded and the eight parents were regenerated in scoped mode. Final optimized-image, redirect-status, and screenshot evidence remains a draft-preview task.

After Tampa Bay's draft preview is verified, open the next connected high-impact metro cluster only where current official visitor sources and representative reusable media support a reviewable batch. Continue the same four-photo parent gate and exact-photo, exact-position, destination-specific-profile gate. Keep Julian B. Lane, Boyd Hill, inland Broward, Olbrich Park, Riverside Regional Park, and Broad Ripple Park deferred until their documented media gaps are resolved.

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
