# National Enrichment Current Checkpoint

Last updated: 2026-08-11

## Current State

- Status: the inland Broward photo-gate re-audit is complete; all three candidates remain deferred.
- Working branch: `codex/inland-broward-evidence-gate`
- Pull request: https://github.com/Buildrbear/auditmap/pull/24
- Stacked base pull request: https://github.com/Buildrbear/auditmap/pull/23
- Inland Broward research commit: `9d67ad496`
- Outcome: 61 candidate images reviewed, zero parents accepted, zero destinations accepted.
- Preview: not required because this is a research-only batch with no generated UI changes.
- Production status: not merged or promoted to production.
- Canonical machine-readable checkpoint: `data/us-priority-enrichment-queue.json` under `activeCluster.resumeCheckpoint`.

The Cleveland, Detroit, Columbus, Cincinnati, Indianapolis, and Upper Midwest corridors remain complete through their preview-verified batches. The inland Broward retry checked recently indexed Broward County visitor guidance and 61 nominally reusable image candidates for T.Y. Park, Tree Tops Park, and Vista View Park. The county sources returned HTTP 404 during final live validation. T.Y. Park's reusable results are a near-duplicate 2007 event series, while Tree Tops and Vista View returned unrelated, wildlife-only, or all-rights-reserved exact-location media. None provides the reachable official sourcing and varied representative coverage required for publication, so no parent or destination record was promoted.

## Resume Point

Do not repeat the completed Midwest or inland Broward batches unless review finds a specific defect or new permission-cleared representative media becomes available. The source-identical Upper Midwest pages passed 390-pixel and 1440-pixel browser checks without horizontal overflow or browser console warnings or errors. Authenticated preview checks returned HTTP 200 for all twelve retained parent and destination routes, HTTP 308 for the retired Botanical Gardens subsite, and valid optimized payloads for all twenty-two campaign images. The inland Broward batch changes research and checkpoint files only, so page generation, browser, and Vercel image checks are not applicable. The full national campaign runner still reaches the known pre-existing Philadelphia source/generated mismatch after the first thirty campaign suites; this batch does not alter those Philadelphia records.

Open the connected Miami waterfront evidence-gate rebuild across Maurice A. Ferre Park, Bayfront Park, South Pointe Park, Lummus Park, Matheson Hammock Park, Crandon Park, Bill Baggs Cape Florida State Park, and Historic Virginia Key Beach Park. Re-audit the eight legacy enriched records against current official guidance, varied reusable parent photography, exact destination positions, and destination-specific photographic evidence. Retire or defer weak legacy subsites rather than inheriting broad parent imagery or stale visitor facts.

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
