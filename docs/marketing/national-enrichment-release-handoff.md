# National Enrichment Release Handoff

## Candidate

- Protected preview: `https://auditmap-74sk4oq7k-derrys-projects-f5a18cb6.vercel.app`
- Deployment: `dpl_FANQuVgxhwdBKRwtetzKQ9QdFP4b`
- Scope: the current nationwide AuditMap runtime and all 49 completed super-enrichment campaigns
- Production publication: not performed
- Incomplete work excluded: Tucson and Tulsa anchor connector
- Assignment: direct AuditMap owner request in the active Codex task; no separate OpenTask or GitHub issue URL was supplied

## Verified 2026-08-08

The complete super-enrichment verifier suite passed `49/49` with zero failures before the preview build.

The protected preview was then checked through authenticated Vercel requests:

- El Dorado East Regional Park returned HTTP 200 with its canonical metadata, City of Long Beach source label, and El Dorado Nature Center Trails subsite in raw HTML.
- Falls Park returned HTTP 200 with its canonical metadata, Experience Sioux Falls source label, and Queen Bee Mill Ruins subsite in raw HTML.
- Falls Park Viewing Tower returned HTTP 200 with seasonal visitor guidance, elevator information, source attribution, and exact navigation coordinates in raw HTML.
- `sitemap.xml` returned HTTP 200 and contains the tested parent and subsite canonical routes.
- Trailing-slash requests return 308 redirects to the configured clean canonical URLs.
- At 390 pixels, the tested El Dorado parent and Falls Park Viewing Tower subsite had no horizontal overflow; the tower retained its exact navigation link.
- At 1440 pixels, Falls Park had no horizontal overflow and displayed all four released subsites.

Machine-readable evidence is in `preview/national-enrichment-release-validation.json`.

## Source And Image Evidence

- Each campaign definition records its official operator source and checked date.
- Campaign image-selection files record the source page, creator or owner, reusable license, license URL, alt text, and destination assignment.
- Generated `data/generated/official-catalog.json` carries the reviewed public records used by the pages.
- Uncertain coordinates, weak photo coverage, outdated imagery, and unsupported subsites remain deferred in `data/us-priority-enrichment-queue.json` rather than being presented as verified.
- No Google, Yelp, Wanderlog, or other proprietary review text or imagery was copied into this release.

## Paused Research

Tucson/Tulsa research stopped after licensed-image discovery and boundary discovery. Ninety-one image candidates are awaiting visual review, and nearby-feature research must be restarted. No Tucson/Tulsa campaign output was generated or represented as release-ready.

## Maintainer Release Sequence

1. Resolve the Vercel project mismatch: GitHub's automatic check targets `michael-hobgoods-projects/auditmap`, while the verified protected preview belongs to `derrys-projects-f5a18cb6/auditmap`.
2. Inspect the failed Git-linked deployment `dpl_E3A6f3bjja8pzP2CdgNamSGPsjXu` from an account with access to the `michael-hobgoods-projects` scope.
3. Review the protected preview and the changed runtime, API, and database surface.
4. Confirm representative desktop and 390-pixel layouts in the preview, including one parent and one subsite page.
5. Review the source and image-rights records for newly completed clusters.
6. Promote through the normal production process only after maintainer approval and a passing Git-linked check.
7. Recheck representative public routes, sitemap entries, map visibility, and the Ask AuditMap flow after promotion.

## Risk And Rollback

- The candidate is large and includes API, moderation, account, media, database-schema, and Vercel configuration changes in addition to generated park content. These areas require maintainer security review before production publication.
- GitHub currently reports the automatic `Vercel - auditmap` check as failed. The available CLI session cannot inspect that deployment because it belongs to a different Vercel scope; the successful protected preview does not override this release gate.
- No production database write or production deployment was performed.
- If production promotion causes map, place-page, navigation, moderation, or API regressions, use the normal Vercel rollback process and pause further enrichment publication.
