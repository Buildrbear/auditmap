# National Enrichment Current Checkpoint

Last updated: 2026-08-11

## Current State

- Status: the Pittsburgh campaign source-persistence repair is generated, locally verified, and preview-verified for routes and optimized images; all 51 national enrichment campaign verifiers pass with zero failures.
- Working branch: `codex/pittsburgh-source-persistence`
- Pull request: https://github.com/Buildrbear/auditmap/pull/28 (draft, stacked on PR #27)
- Outcome: eight authoritative Pittsburgh parent records, 54 existing reviewed images, and 21 existing evidence-complete destinations now survive clean full regeneration; the verifier checks four source layers as well as rendered output.
- Preview: https://auditmap-fzaopcwx8-derrys-projects-f5a18cb6.vercel.app (Ready implementation preview at commit `aacc1fd`; all 29 routes and 54 optimized images passed authenticated requests, while the ordinary visual browser remains redirected to Vercel SSO).
- Production status: not merged or promoted to production.
- Canonical machine-readable checkpoint: `data/us-priority-enrichment-queue.json` under `activeCluster.resumeCheckpoint`.

The Cleveland, Detroit, Columbus, Cincinnati, Indianapolis, Upper Midwest, inland Broward, Miami, Tampa Bay, and Philadelphia batches remain complete at their previous checkpoints. Pittsburgh's prior evidence decisions are unchanged; this repair makes their reviewed records authoritative for future generators.

## Resume Point

Do not repeat completed batches unless review finds a specific defect or new evidence changes a deferred decision. Pittsburgh's 29 retained routes passed local 390-pixel checks, all eight parents passed 1440-pixel checks, and no horizontal overflow or browser warning/error was observed. An isolated full generation preserved all eight reviewed galleries, answer sets, and destination sets. The Ready preview served all 29 routes and 54 optimized images through authenticated checks; only a visual-browser screenshot remains unavailable behind Vercel SSO.

After maintainer review of Pittsburgh's stacked draft, open the next connected high-impact metro cluster only where current official visitor sources and representative reusable media support a reviewable batch. Continue the same four-photo parent gate and exact-photo, exact-position, destination-specific-profile gate. Keep Julian B. Lane, Boyd Hill, inland Broward, Olbrich Park, Riverside Regional Park, and Broad Ripple Park deferred until their documented media gaps are resolved.

Keep T.Y. Park, Tree Tops Park, and Vista View Park in the deferred-photo queue until each has three to four representative permission-cleared views. Keep Olbrich Park in review until at least two additional representative reusable park views are available. Riverside Park in Grand Rapids remains parent-only until a destination-specific photo, exact pin, and current destination profile clear together. Seasonal Millennium beach/splashpad operations, Riverside kayaking and flooding, North Point Lighthouse schedules, Vilas beach conditions, Madison restroom closures, Castaway Island's seasonal schedule, and Vista View capital projects remain freshness risks requiring operator rechecks.

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
