# National Enrichment Current Checkpoint

Last updated: 2026-08-11

## Current State

- Status: the second Columbus evidence-gate batch is locally verified and preview-verified.
- Working branch: `codex/columbus-schiller-whetstone`
- Pull request: https://github.com/Buildrbear/auditmap/pull/15
- Stacked base pull request: https://github.com/Buildrbear/auditmap/pull/14
- Columbus implementation commit: `4b020c309`
- Preview: https://auditmap-i7fr1du7e-derrys-projects-f5a18cb6.vercel.app
- Production status: not merged or promoted to production.
- Canonical machine-readable checkpoint: `data/us-priority-enrichment-queue.json` under `activeCluster.resumeCheckpoint`.

The Cleveland and Detroit corridors remain complete through their preview-verified batches. Columbus now has two evidence-gated releases: the downtown core from PR #14 and a neighborhood-gardens batch covering Schiller Park and Whetstone Park / Columbus Park of Roses. The second batch retains Schiller Park Pond, Schiller Statue, and Columbus Park of Roses as exact, photo-backed destinations. Fourteen legacy routes that lacked a complete exact profile or destination-specific reusable photography now redirect permanently to their parent guides.

## Resume Point

Do not repeat the Cleveland, Detroit, or first two Columbus batches unless review finds a specific defect. In the second batch, all five retained routes returned HTTP 200 on the protected preview, all fourteen retired routes returned permanent redirects to the correct parent, and all eight parent-gallery images rendered through Vercel's image optimizer. Optimized images for the pond, statue, and current rose garden were visually checked. All five routes fit a 390-pixel viewport without horizontal overflow, and both parent pages passed at 1280 pixels.

Continue Columbus with a fresh evidence gate rather than reviving legacy placeholder cards. Prioritize a Columbus and Franklin County Metro Parks batch, beginning with Highbanks and Battelle Darby Creek if their parent galleries and destination photo/coordinate pairs clear review. Treat Quarry Trails as a candidate, not a committed release: its existing research references official-site imagery without a documented reuse basis, which is not publishable under the image standard.

Keep the fourteen retired Schiller/Whetstone concepts in review until each clears the exact-profile and reusable-photo gates. Huntington Gardens has a reusable aerial and partner guidance but still lacks a reviewed authoritative public destination coordinate. Do not publish Umbrella Girl Fountain until both destination evidence and underlying artwork reuse rights are clear. Recheck the active Schiller and Whetstone improvement plans as current project guidance rather than treating them as closure notices. The first-batch Franklin Park Cascades closure also still requires a newer official notice before any access claim changes.

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
