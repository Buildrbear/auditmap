# National Enrichment Release Handoff

## Candidate

- Git-linked protected preview: `https://auditmap-d35oxwyp9-derrys-projects-f5a18cb6.vercel.app`
- Git-linked deployment: `dpl_5F4QU3FoNcyNLqZ4KCrJfc6cKqwU`
- Scope: the current nationwide AuditMap runtime and all 50 completed super-enrichment campaigns
- Production publication: not performed
- Completed final cluster: Tucson and Tulsa anchor connector
- Assignment: direct AuditMap owner request in the active Codex task; no separate OpenTask or GitHub issue URL was supplied

## Verified 2026-08-08

The complete super-enrichment verifier suite passed `50/50` with zero failures after the Tucson/Tulsa map-answer merge check and before the preview build.

The protected preview was then checked through authenticated Vercel requests:

- Reid Park returned HTTP 200 with canonical metadata, full address, City of Tucson attribution, Cele Peterson Rose Garden, and Hi Corbett Field in raw HTML.
- Rillito River Park Path returned HTTP 200 with sunrise-to-sunset guidance, Pima County attribution, current closure-check guidance, and exact navigation coordinates in raw HTML.
- Gathering Place returned HTTP 200 with its full address, Chapman Adventure Playground, and Vista at the Boathouse in raw HTML.
- Teaching Garden returned HTTP 200 with pay-as-you-wish guidance, the former Linnaeus-name context, Tulsa Garden Center attribution, and exact navigation coordinates in raw HTML.
- `sitemap.xml` returned HTTP 200 and contains all tested Tucson/Tulsa parent and subsite canonical routes.
- Vercel's optimizer rendered the new Reid Park hero at 828 by 526 pixels as a 77,352-byte image.
- At 390 pixels, Reid Park and Rillito River Park Path had no horizontal overflow; exact trail navigation remained present.
- At 1440 pixels, Gathering Place and Teaching Garden had no horizontal overflow; the Tulsa parent retained both released subsite links.

Machine-readable evidence is in `preview/national-enrichment-release-validation.json`.

## Source And Image Evidence

- Each campaign definition records its official operator source and checked date.
- Campaign image-selection files record the source page, creator or owner, reusable license, license URL, alt text, and destination assignment.
- Generated `data/generated/official-catalog.json` carries the reviewed public records used by the pages.
- Uncertain coordinates, weak photo coverage, outdated imagery, and unsupported subsites remain deferred in `data/us-priority-enrichment-queue.json` rather than being presented as verified.
- No Google, Yelp, Wanderlog, or other proprietary review text or imagery was copied into this release.

## Paused Research

Tucson and Tulsa are complete at the reviewed launch standard: four parent guides, 16 licensed photographs, 59 preserved parent answers, and eight evidence-complete subsite pages. No next cluster is active. Remaining uncertain amenities and missing destination-specific images are recorded in the per-place research queues rather than published as verified subsites.

## Maintainer Release Sequence

1. Review the Git-linked protected preview and the changed runtime, API, and database surface.
2. Confirm representative desktop and 390-pixel layouts in the preview, including one parent and one subsite page.
3. Review the source and image-rights records for newly completed clusters.
4. Promote through the normal production process only after maintainer approval.
5. Recheck representative public routes, sitemap entries, map visibility, and the Ask AuditMap flow after promotion.

## Risk And Rollback

- The candidate is large and includes API, moderation, account, media, database-schema, and Vercel configuration changes in addition to generated park content. These areas require maintainer security review before production publication.
- An earlier automatic deployment reported a stale cross-project failure, but the follow-up Git-linked deployment completed successfully in the expected Derry project. Treat any recurrence as a project-linking issue and inspect it before production promotion.
- No production database write or production deployment was performed.
- If production promotion causes map, place-page, navigation, moderation, or API regressions, use the normal Vercel rollback process and pause further enrichment publication.
