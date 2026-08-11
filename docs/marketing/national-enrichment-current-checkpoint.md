# National Enrichment Current Checkpoint

Last updated: 2026-08-11

## Current State

- Status: the Indianapolis Fort Harrison and Riverside evidence-gate batch is locally verified and preview-verified.
- Working branch: `codex/indianapolis-fort-harrison-riverside`
- Pull request: https://github.com/Buildrbear/auditmap/pull/21
- Stacked base pull request: https://github.com/Buildrbear/auditmap/pull/20
- Indianapolis implementation commit: `ccda052ce`
- Preview: https://auditmap-git-codex-indianapolis-71a8db-derrys-projects-f5a18cb6.vercel.app
- Production status: not merged or promoted to production.
- Canonical machine-readable checkpoint: `data/us-priority-enrichment-queue.json` under `activeCluster.resumeCheckpoint`.

The Cleveland and Detroit corridors remain complete through their preview-verified batches, Columbus remains complete through four evidence-gated releases in PRs #14-#17, Cincinnati is complete through its downtown batch in PR #18, and Indianapolis now has three evidence-gated releases in PRs #19-#21. The third Indianapolis batch rebuilds Fort Harrison State Park as a parent-only guide around four public-domain Commons photographs and current Indiana DNR guidance. Eight weak legacy destination routes now redirect permanently to the parent guide. Riverside Regional Park was audited but deferred because its official photographs do not state reuse permission and its reusable corpus does not provide four varied current parent views.

## Resume Point

Do not repeat the Cleveland, Detroit, four Columbus batches, Cincinnati downtown batch, or the first three Indianapolis batches unless review finds a specific defect. For this Indianapolis batch, the Fort Harrison parent route returned HTTP 200 on the protected preview, all eight retired routes returned permanent redirects to the correct parent, and all four gallery images rendered as real 828-by-518 optimized payloads through Vercel's image optimizer. The source-identical page passed 390-pixel and 1280-pixel browser checks without horizontal overflow, blank states, application error overlays, or browser console warnings or errors. GitHub's contribution validation also passed.

Continue the remaining Indianapolis inventory with Broad Ripple Park and White River State Park parent-photo audits. Accept either parent only after locating at least four representative reusable photographs and current official visitor guidance; remove the existing unclear-rights official-site image claims rather than treating them as licenses. Do not preserve legacy destination cards merely because they already exist.

Keep all nineteen retired Indianapolis concepts in review until each clears the exact-profile and reusable-photo gates. Fort Harrison's Visitor Center, Harrison Trace Trail, Delaware Lake, Duck Pond, Lawrence Creek Trail, Museum of 20th Century Warfare, sledding hill, and dog park remain parent guidance; the four reviewed parent photographs must not be reassigned to those destinations. Riverside remains photo-gated, and its official redevelopment page mixes completed, under-construction, and anticipated language that requires current operator confirmation. The earlier Garfield, Holliday, Eagle Creek, Monon, Cincinnati, and Columbus review items remain unresolved.

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
