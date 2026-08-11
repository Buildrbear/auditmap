# National Enrichment Current Checkpoint

Last updated: 2026-08-11

## Current State

- Status: the Indianapolis Broad Ripple and White River evidence-gate batch is locally verified and its preview endpoints are verified.
- Working branch: `codex/indianapolis-broad-ripple-white-river`
- Pull request: https://github.com/Buildrbear/auditmap/pull/22
- Stacked base pull request: https://github.com/Buildrbear/auditmap/pull/21
- Indianapolis implementation commit: `c3cc691fa`
- Preview: https://auditmap-git-codex-indianapolis-72c26c-derrys-projects-f5a18cb6.vercel.app
- Production status: not merged or promoted to production.
- Canonical machine-readable checkpoint: `data/us-priority-enrichment-queue.json` under `activeCluster.resumeCheckpoint`.

The Cleveland and Detroit corridors remain complete through their preview-verified batches, Columbus remains complete through four evidence-gated releases in PRs #14-#17, Cincinnati is complete through its downtown batch in PR #18, and Indianapolis now has four evidence-gated releases in PRs #19-#22. The fourth Indianapolis batch rebuilds White River State Park as a parent-only guide around four CC BY-SA Commons photographs and current operator guidance. Eight weak legacy destination routes now redirect permanently to the parent guide. Broad Ripple Park was audited but deferred because its official photographs do not state reuse permission and nearby reusable media does not provide four representative park-specific views.

## Resume Point

Do not repeat the Cleveland, Detroit, four Columbus batches, Cincinnati downtown batch, or the four Indianapolis batches unless review finds a specific defect. For this Indianapolis batch, authenticated deployment checks returned HTTP 200 for the White River parent route, permanent redirects for all eight retired routes, and real 828-by-518 optimized payloads for all four gallery images. The source-identical page passed 390-pixel and 1280-pixel browser checks without horizontal overflow, blank states, application error overlays, or browser console warnings or errors. The current in-app browser cannot open the access-protected remote preview UI, so remote verification is limited to the authenticated deployment endpoints rather than a second visual pass.

Start the next connected Midwest candidate audit with Grand Rapids' Millennium Park and Riverside Park, Milwaukee's Lake Park and Veterans Park, and Madison's Olbrich Park and Vilas Park. Accept a parent only after locating at least four representative reusable photographs and current official visitor guidance. Do not preserve legacy destination cards merely because they already exist.

Keep all twenty-seven retired Indianapolis concepts in review until each clears the exact-profile and reusable-photo gates. White River's Downtown Canal Walk, Old Washington Street Bridge, Celebration Plaza, Indiana State Museum Lawn, Military Park, NCAA Hall of Champions, Eiteljorg Museum, and Indianapolis Zoo remain parent guidance; the four reviewed parent photographs must not be reassigned to those destinations. Broad Ripple and Riverside remain photo-gated. Riverside's official redevelopment page mixes completed, under-construction, and anticipated language that requires current operator confirmation. The earlier Fort Harrison, Garfield, Holliday, Eagle Creek, Monon, Cincinnati, and Columbus review items remain unresolved.

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
