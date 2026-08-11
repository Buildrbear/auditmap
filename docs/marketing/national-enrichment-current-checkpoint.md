# National Enrichment Current Checkpoint

Last updated: 2026-08-11

## Current State

- Status: the fourth Columbus evidence-gate batch is locally verified and preview-verified.
- Working branch: `codex/columbus-quarry-trails`
- Pull request: https://github.com/Buildrbear/auditmap/pull/17
- Stacked base pull request: https://github.com/Buildrbear/auditmap/pull/16
- Columbus implementation commit: `5cf2405cf`
- Preview: https://auditmap-git-codex-columbus-qua-2b80e0-derrys-projects-f5a18cb6.vercel.app
- Production status: not merged or promoted to production.
- Canonical machine-readable checkpoint: `data/us-priority-enrichment-queue.json` under `activeCluster.resumeCheckpoint`.

The Cleveland and Detroit corridors remain complete through their preview-verified batches. Columbus now has four evidence-gated releases: the downtown core from PR #14, Schiller/Whetstone from PR #15, Highbanks/Battelle Darby Creek from PR #16, and Quarry Trails from PR #17. The fourth batch rebuilds Quarry Trails Metro Park around four licensed Commons photographs and retains Millikin Falls as its one exact, destination-photo-backed page. Seven weaker legacy routes now redirect permanently to the parent guide.

## Resume Point

Do not repeat the Cleveland, Detroit, or four Columbus batches unless review finds a specific defect. For Quarry Trails, both retained routes returned HTTP 200 on the protected preview, all seven retired routes returned permanent redirects to the correct parent, and all four gallery images rendered through Vercel's image optimizer and were visually checked. The source-identical parent and Millikin Falls pages passed local 390-pixel checks without horizontal overflow, and the destination also passed at 1280 pixels.

Continue with a fresh evidence gate in the next high-impact connected metro rather than reviving legacy placeholder cards. Quarry Trails cleared the parent-photo gate only after its four unlicensed official-site image claims were removed and replaced with documented CC BY-SA 4.0 and CC BY 2.0 Commons media. Keep its via ferrata, sport-climbing area, mountain-bike trail, dog park, Swan Lake, Observation Trail and Lake Area deferred until each has an exact reviewed coordinate, a matching reusable photograph and a complete current profile.

Keep all retired Columbus concepts in review until each clears the exact-profile and reusable-photo gates. Quarry Trails remains under active construction and closes at dark; climbing, paddling, biking and other activity areas can change independently. The Highbanks acreage conflict, moving bison, Battelle hunting zones, Huntington Gardens, Umbrella Girl Fountain, active improvement plans and the Franklin Park Cascades closure remain unresolved review items.

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
