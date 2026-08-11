# National Enrichment Current Checkpoint

Last updated: 2026-08-11

## Current State

- Status: the Cincinnati downtown evidence-gate batch is locally verified and preview-verified.
- Working branch: `codex/cincinnati-downtown-parks`
- Pull request: https://github.com/Buildrbear/auditmap/pull/18
- Stacked base pull request: https://github.com/Buildrbear/auditmap/pull/17
- Cincinnati implementation commit: `a9f9e2339`
- Preview: https://auditmap-git-codex-cincinnati-d-484289-derrys-projects-f5a18cb6.vercel.app
- Production status: not merged or promoted to production.
- Canonical machine-readable checkpoint: `data/us-priority-enrichment-queue.json` under `activeCluster.resumeCheckpoint`.

The Cleveland and Detroit corridors remain complete through their preview-verified batches, and Columbus remains complete through four evidence-gated releases in PRs #14-#17. Cincinnati now has a downtown evidence-gated release in PR #18. It rebuilds Smale Riverfront Park and Washington Park around eight licensed Commons photographs and retains only Marian Spencer Statue and Washington Park Dog Park as exact, destination-photo-backed pages. Fourteen weaker legacy routes now redirect permanently to their parent guides.

## Resume Point

Do not repeat the Cleveland, Detroit, four Columbus batches, or Cincinnati downtown batch unless review finds a specific defect. For Cincinnati, all four retained routes returned HTTP 200 on the protected preview, all fourteen retired routes returned permanent redirects to the correct parent, and all eight gallery images rendered through Vercel's image optimizer. The source-identical pages passed 390-pixel and 1280-pixel browser checks without horizontal overflow or application error overlays.

Continue with a fresh Indianapolis evidence gate rather than reviving legacy placeholder cards. Begin by auditing the existing Indianapolis inventory and retain only parents with current official visitor guidance and enough representative reusable photography. Cincinnati cleared its parent-photo gate only after unlicensed official-site image claims were removed and replaced with documented Commons media.

Keep all retired Cincinnati concepts in review until each clears the exact-profile and reusable-photo gates. Smale's carousel, playground, fountains, swings and labyrinth remain parent guidance. Washington Park's playground, water park, porch, lawn, bandstand, Music Hall view and garage remain parent guidance. The Washington Park garage currently has conflicting operator capacity figures—450 in detailed text and 607 in a live valet-assist banner—so no exact capacity is published. Existing Columbus review items remain unresolved.

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
