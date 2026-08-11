# National Enrichment Current Checkpoint

Last updated: 2026-08-10

## Current State

- Status: first Detroit riverfront batch is locally verified and preview-verified.
- Working branch: `codex/detroit-riverfront-evidence-rebuild`
- Pull request: https://github.com/Buildrbear/auditmap/pull/11
- Stacked base pull request: https://github.com/Buildrbear/auditmap/pull/10
- Detroit release commit: `29fe472a7`
- Preview: https://auditmap-bh5x3k6sb-derrys-projects-f5a18cb6.vercel.app
- Production status: not merged or promoted to production.
- Canonical machine-readable checkpoint: `data/us-priority-enrichment-queue.json` under `activeCluster.resumeCheckpoint`.

The Cleveland corridor remains complete through its three preview-verified batches. The first Detroit batch continues west with Belle Isle Park, Detroit RiverWalk, and Ralph C. Wilson Jr. Centennial Park. It retains five exact destination pages: Belle Isle Aquarium, Anna Scripps Whitcomb Conservatory, Dossin Great Lakes Museum, Huron-Clinton Metroparks Water Garden, and William Davidson Sport House. Detroit RiverWalk launches as a current parent-only guide until its individual segments clear the exact-arrival and destination-photo gates.

## Resume Point

Do not repeat the Cleveland batches or the first Detroit riverfront batch unless review finds a specific defect. The Detroit preview is complete: all eight parent and destination routes returned successfully, all five optimized destination images rendered and were visually checked, representative retired routes resolved with permanent redirects, and every changed page fit both 1440-pixel and 390-pixel layouts without horizontal overflow. Continue the connected Detroit review with Dequindre Cut, Campus Martius Park, and Hart Plaza.

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
