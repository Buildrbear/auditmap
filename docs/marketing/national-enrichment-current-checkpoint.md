# National Enrichment Current Checkpoint

Last updated: 2026-08-11

## Current State

- Status: the third Columbus evidence-gate batch is locally verified and preview-verified.
- Working branch: `codex/columbus-highbanks-darby`
- Pull request: https://github.com/Buildrbear/auditmap/pull/16
- Stacked base pull request: https://github.com/Buildrbear/auditmap/pull/15
- Columbus implementation commit: `cdff270c5`
- Preview: https://auditmap-j7nqrct40-derrys-projects-f5a18cb6.vercel.app
- Production status: not merged or promoted to production.
- Canonical machine-readable checkpoint: `data/us-priority-enrichment-queue.json` under `activeCluster.resumeCheckpoint`.

The Cleveland and Detroit corridors remain complete through their preview-verified batches. Columbus now has three evidence-gated releases: the downtown core from PR #14, the Schiller/Whetstone neighborhood-gardens batch from PR #15, and this Metro Parks batch covering Highbanks and Battelle Darby Creek. The third batch retains Highbanks Observation Deck, Battelle Darby Creek Nature Center, and Bison Pastures as exact, photo-backed destinations. Thirteen legacy routes that lacked a complete exact profile or destination-specific reusable photography now redirect permanently to their parent guides.

## Resume Point

Do not repeat the Cleveland, Detroit, or first three Columbus batches unless review finds a specific defect. In the third batch, all five retained routes returned HTTP 200 on the protected preview, all thirteen retired routes returned permanent redirects to the correct parent, and all eight parent-gallery images rendered through Vercel's image optimizer. Optimized images for Highbanks Observation Deck, Battelle Darby Creek Nature Center, and the bison pasture were visually checked. All five routes fit a 390-pixel viewport without horizontal overflow, and both parent pages passed at 1280 pixels.

Continue with a fresh evidence gate rather than reviving legacy placeholder cards. Quarry Trails is the remaining Columbus campaign candidate, but its current research references official-site imagery without a documented reuse basis. Keep it deferred until four representative reusable photographs and at least one exact destination photo/coordinate pair clear review; if that evidence remains unavailable, move to the next evidence-strong metro rather than weakening the image standard.

Keep the thirteen retired Highbanks/Battelle concepts in review until each clears the exact-profile and reusable-photo gates. The Highbanks operator pages currently conflict on acreage (1,204 versus 1,160), so the guide intentionally avoids a precise acreage claim. Bison move between winter and summer pastures and may be out of view; never promise a sighting. Recheck Battelle hunting zones, posted conditions, and seasonal facility schedules before publication. Earlier Columbus review queues—including Huntington Gardens, Umbrella Girl Fountain, active improvement plans, and the Franklin Park Cascades closure—remain unresolved.

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
