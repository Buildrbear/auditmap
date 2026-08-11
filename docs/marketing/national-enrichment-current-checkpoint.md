# National Enrichment Current Checkpoint

Last updated: 2026-08-11

## Current State

- Status: second Detroit downtown batch is locally verified and preview-verified.
- Working branch: `codex/detroit-downtown-evidence-rebuild`
- Pull request: https://github.com/Buildrbear/auditmap/pull/12
- Stacked base pull request: https://github.com/Buildrbear/auditmap/pull/11
- Detroit release commit: `6de6ab456`
- Preview: https://auditmap-git-codex-detroit-down-241624-derrys-projects-f5a18cb6.vercel.app
- Production status: not merged or promoted to production.
- Canonical machine-readable checkpoint: `data/us-priority-enrichment-queue.json` under `activeCluster.resumeCheckpoint`.

The Cleveland corridor remains complete through its three preview-verified batches. Detroit now has two preview-verified batches covering Belle Isle Park, Detroit RiverWalk, Ralph C. Wilson Jr. Centennial Park, Dequindre Cut, Campus Martius Park, and Hart Plaza. The second batch retains three exact destination pages: The Rink at Campus Martius, Dodge Fountain, and Transcending. Dequindre Cut launches as a current parent-only guide until an individual destination clears both the exact-arrival and reusable-photo gates.

## Resume Point

Do not repeat the Cleveland batches or the first two Detroit batches unless review finds a specific defect. The second Detroit preview is complete: all six parent and destination routes returned successfully, optimized representative images for all three parents rendered and were visually checked, representative retired routes resolved with permanent redirects, and every changed page fit both 1440-pixel and 390-pixel layouts without horizontal overflow. Continue the connected Detroit review with Rouge Park and Palmer Park.

Keep Freight Yard, Campbell Terrace, individual Dequindre ramps and amenities, the warm-season Campus Martius features, and Gateway to Freedom in the review queue until exact reusable destination photography and current feature-specific guidance clear review. Treat Michigan Labor Legacy Monument as an alias for Transcending, not a second destination; Spirit of Detroit and Monument to Joe Louis are separate landmarks outside Hart Plaza.

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
