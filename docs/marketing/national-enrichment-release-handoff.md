# National Enrichment Release Handoff

## Candidate

- Protected preview: `https://auditmap-j2lq34kqk-derrys-projects-f5a18cb6.vercel.app`
- Preview deployment: `dpl_AeWoakreis9KVAMF9BGJnBUu9AzS`
- Release commit: `34d4e41d09d840edfe9e0b56b8ef36860792cc8c`
- Scope: the current nationwide AuditMap runtime and all 51 completed super-enrichment campaigns
- Production publication: not performed
- Completed final cluster: Potomac suburban park connector
- Assignment: direct AuditMap owner request in the active Codex task; no separate OpenTask or GitHub issue URL was supplied

## Verified 2026-08-10

The complete super-enrichment verifier suite passed `51/51` with zero failures. The Potomac campaign verifier confirmed 17 parent guides, 90 mapped destinations, 74 sourced photographs, raw visitor answers, exact navigation, source evidence, and canonical pages.

The protected preview was then checked through authenticated Vercel requests:

- Cabin John Regional Park, Rock Creek Regional Park, Burke Lake Park, and all seven new destination pages returned HTTP 200.
- `sitemap.xml` returned HTTP 200 and contains the new Maryland and Virginia parent and subsite canonical routes.
- All 15 new licensed photographs returned HTTP 200 through Vercel's image optimizer.
- At 390 pixels, all three new parent pages matched the viewport width with no horizontal overflow.
- GitHub validation, secret scanning, and Vercel Preview Comments completed successfully for the release commit.

Machine-readable evidence is in `preview/national-enrichment-release-validation.json`.

## Source And Image Evidence

- Each campaign definition records its official operator source and checked date.
- Campaign image-selection files record the source page, creator or owner, reusable license, license URL, alt text, and destination assignment.
- Generated `data/generated/official-catalog.json` carries the reviewed public records used by the pages.
- Uncertain coordinates, weak photo coverage, outdated imagery, and unsupported subsites remain deferred in `data/us-priority-enrichment-queue.json` rather than being presented as verified.
- No Google, Yelp, Wanderlog, or other proprietary review text or imagery was copied into this release.

## Paused Research

Cabin John Regional Park, Rock Creek Regional Park, and Burke Lake Park are complete at the reviewed launch standard with 15 licensed photographs and seven evidence-complete destination pages. No next cluster is active while publication review is underway. Resume from the Potomac suburban checkpoint in `data/us-priority-enrichment-queue.json` after owner direction.

## Maintainer Release Sequence

1. Review the Git-linked protected preview and the changed runtime, API, and database surface.
2. Confirm representative desktop and 390-pixel layouts in the preview, including one parent and one subsite page.
3. Review the source and image-rights records for newly completed clusters.
4. Promote through the normal production process only after maintainer approval.
5. Recheck representative public routes, sitemap entries, map visibility, and the Ask AuditMap flow after promotion.

## Risk And Rollback

- The candidate is large and includes API, moderation, account, media, database-schema, and Vercel configuration changes in addition to generated park content. These areas require maintainer security review before production publication.
- The automatic `michael-hobgoods-projects/auditmap` integration still reports a cross-project failure. The clean release commit deployed successfully to the authorized `derrys-projects-f5a18cb6/auditmap` project; treat the red duplicate status as a project-linking issue and remove or relink that obsolete integration before production promotion.
- No production database write or production deployment was performed.
- If production promotion causes map, place-page, navigation, moderation, or API regressions, use the normal Vercel rollback process and pause further enrichment publication.
