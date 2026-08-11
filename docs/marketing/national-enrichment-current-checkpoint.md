# National Enrichment Current Checkpoint

Last updated: 2026-08-11

## Current State

- Status: the Indianapolis Eagle Creek and Monon evidence-gate batch is locally verified and preview-verified.
- Working branch: `codex/indianapolis-eagle-monon`
- Pull request: https://github.com/Buildrbear/auditmap/pull/19
- Stacked base pull request: https://github.com/Buildrbear/auditmap/pull/18
- Indianapolis implementation commit: `628374666`
- Preview: https://auditmap-git-codex-indianapolis-d18524-derrys-projects-f5a18cb6.vercel.app
- Production status: not merged or promoted to production.
- Canonical machine-readable checkpoint: `data/us-priority-enrichment-queue.json` under `activeCluster.resumeCheckpoint`.

The Cleveland and Detroit corridors remain complete through their preview-verified batches, Columbus remains complete through four evidence-gated releases in PRs #14-#17, and Cincinnati is complete through its downtown batch in PR #18. Indianapolis now has a first evidence-gated release in PR #19. It rebuilds Eagle Creek Park and Monon Trail around eight licensed Commons photographs and retains only Eagle Creek Park Ornithology Center as an exact, destination-photo-backed page. Fifteen weaker legacy routes now redirect permanently to their parent guides.

## Resume Point

Do not repeat the Cleveland, Detroit, four Columbus batches, Cincinnati downtown batch, or this Indianapolis batch unless review finds a specific defect. For Indianapolis, all three retained routes returned HTTP 200 on the protected preview, all fifteen retired routes returned permanent redirects to the correct parent, and all eight gallery images rendered through Vercel's image optimizer. The source-identical pages passed 390-pixel and 1280-pixel browser checks without horizontal overflow, blank states, application error overlays, or browser console errors.

Continue the remaining Indianapolis inventory with a Garfield Park and Holliday Park parent-photo audit. Accept either parent only after locating at least four representative reusable photographs and current official visitor guidance; do not preserve legacy destination cards merely because they already exist.

Keep all fifteen retired Indianapolis concepts in review until each clears the exact-profile and reusable-photo gates. Eagle Creek's Earth Discovery Center, beach, marina, Lilly Lake, Pin Oak Trail, Canine Companion Zone, and Go Ape remain parent guidance. The former Monon access-segment cards remain parent guidance, while Frank and Judy O'Bannon Park, Canterbury Park, and Marott Park require independent parent records rather than Monon subsites. Canterbury Park construction is expected through late 2026. The Commons file titled as a nature center is assigned only to the Ornithology Center because its description and exact camera geotag identify that building; it must not be reused for the Earth Discovery Center. Existing Cincinnati and Columbus review items remain unresolved.

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
