# National Enrichment Current Checkpoint

Last updated: 2026-08-11

## Current State

- Status: the first Columbus evidence-gate batch is locally verified and preview-verified.
- Working branch: `codex/columbus-core-evidence-rebuild`
- Pull request: https://github.com/Buildrbear/auditmap/pull/14
- Stacked base pull request: https://github.com/Buildrbear/auditmap/pull/13
- Columbus implementation commit: `bfde56488`
- Preview: https://auditmap-7s2r2hdz1-derrys-projects-f5a18cb6.vercel.app
- Production status: not merged or promoted to production.
- Canonical machine-readable checkpoint: `data/us-priority-enrichment-queue.json` under `activeCluster.resumeCheckpoint`.

The Cleveland and Detroit corridors remain complete through their preview-verified batches. Columbus now has an initial downtown-core release covering Scioto Mile, Franklin Park, and Goodale Park. It retains five evidence-complete destinations: Scioto Mile Promenade, Franklin Park Conservatory, Franklin Park Cascades, Goodale Park Pond, and Goodale Park Shelterhouse. Nineteen legacy destination routes that lacked a complete exact profile or destination-specific reusable photography now redirect permanently to their parent guides.

## Resume Point

Do not repeat the Cleveland, Detroit, or first Columbus batch unless review finds a specific defect. All eight retained Columbus parent and destination routes returned HTTP 200 on the protected preview, all nineteen retired routes returned permanent redirects to the correct parent, and all twelve parent-gallery images rendered through Vercel's image optimizer. Six representative optimized images were visually checked, and all eight routes fit a 390-pixel viewport without horizontal overflow; Scioto Mile also passed a 1280-pixel desktop check.

Continue Columbus with a fresh evidence gate rather than reviving its legacy placeholder cards. Schiller Park and Whetstone Park / Park of Roses are reasonable next research candidates because they can form a coherent city-park batch, but they must still clear current official-source, exact-coordinate, and destination-photo requirements. A Columbus and Franklin County Metro Parks batch is also viable if its individual parks have enough reusable, destination-specific photography.

Keep Bicentennial Park, Coleman Point, Genoa Park, Main Street Bridge, North Bank Park, Rich Street Bridge, Scioto Mile Fountain, Asian Garden, Broad Street Entrance, Espy Adaptive Sports Complex, Franklin Park Amphitheater, Wolfe Park Tennis Court, East Broad Street Entrance, Goodale Park basketball and tennis courts, fountain, gazebo, playground, and Short North Entrance in the review queue until each clears the exact-profile and reusable-photo gates. Recheck Franklin Park Cascades before publication or any later release: the official operator reported it closed beginning June 23, 2026, and the page must not imply access has resumed without a newer official notice.

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
