# National Enrichment Current Checkpoint

Last updated: 2026-08-11

## Current State

- Status: the Indianapolis Garfield and Holliday evidence-gate batch is locally verified and preview-verified.
- Working branch: `codex/indianapolis-garfield-holliday`
- Pull request: https://github.com/Buildrbear/auditmap/pull/20
- Stacked base pull request: https://github.com/Buildrbear/auditmap/pull/19
- Indianapolis implementation commit: `865e913b7`
- Preview: https://auditmap-git-codex-indianapolis-4044ed-derrys-projects-f5a18cb6.vercel.app
- Production status: not merged or promoted to production.
- Canonical machine-readable checkpoint: `data/us-priority-enrichment-queue.json` under `activeCluster.resumeCheckpoint`.

The Cleveland and Detroit corridors remain complete through their preview-verified batches, Columbus remains complete through four evidence-gated releases in PRs #14-#17, Cincinnati is complete through its downtown batch in PR #18, and Indianapolis now has two evidence-gated releases in PRs #19-#20. The second Indianapolis batch rebuilds Garfield Park and Holliday Park around eight licensed Commons photographs and retains five exact, destination-photo-backed pages: Garfield Park Conservatory, Sunken Garden, Garfield Park Arts Center, Holliday Park Ruins, and Holliday Park Nature Center. Eleven weaker legacy routes now redirect permanently to their parent guides.

## Resume Point

Do not repeat the Cleveland, Detroit, four Columbus batches, Cincinnati downtown batch, or the first two Indianapolis batches unless review finds a specific defect. For this Indianapolis batch, all seven retained routes returned HTTP 200 on the protected preview, all eleven retired routes returned permanent redirects to the correct parent, and all eight gallery images rendered through Vercel's image optimizer. The source-identical pages passed 390-pixel and 1280-pixel browser checks without horizontal overflow, blank states, application error overlays, or browser console errors. GitHub's validation and committed-secret jobs also passed.

Continue the remaining Indianapolis inventory with a Fort Harrison State Park and Riverside Regional Park parent-photo audit. Accept either parent only after locating at least four representative reusable photographs and current official visitor guidance; do not preserve legacy destination cards merely because they already exist.

Keep all eleven newly retired Indianapolis concepts in review until each clears the exact-profile and reusable-photo gates. Garfield Park's Pagoda, aquatic center, MacAllister Amphitheater, Burrello Family Center, and Pleasant Run Trail remain parent guidance; the Family Center's conflicting schedules require operator clarification, and the new Pagoda-area playground still requires confirmed completion and current photography. Holliday Park's rebuilt playground, generic trails, overlook, arboretum, prairie, and rock garden remain parent guidance; the old playground photograph must not be reused for the 2025 replacement. The Nature Center's reviewed building centroid remains authoritative for navigation because the interior photograph's camera GPS conflicts with the official address. Earlier Indianapolis, Cincinnati, and Columbus review items remain unresolved.

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
