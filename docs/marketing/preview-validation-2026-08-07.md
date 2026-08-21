# AuditMap Loop Preview Validation — August 7, 2026

## Preview

- Deployment: `dpl_DCMUR6gCxkdXcV2VeeiX77WdCa2m`
- Preview URL: `https://auditmap-n9uaf9y8y-derrys-projects-f5a18cb6.vercel.app`
- Inspector: `https://vercel.com/derrys-projects-f5a18cb6/auditmap/DCMUR6gCxkdXcV2VeeiX77WdCa2m`
- Target: Preview only; no production alias or promotion
- Source scope: the full current integrated workspace, which contains broader AuditMap work in addition to the loop changes
- Deployment protection: retained

## Proven On Vercel

- Deployment completed with `READY` state.
- Canonical `/discover/raleigh` returned `HTTP 200` through authenticated Vercel access.
- Raw campaign HTML contained the Raleigh headline and seven discovery cards.
- Canonical `/us/nc/raleigh/parks/dix-park` returned `HTTP 200`.
- Raw Dix Park HTML contained its canonical tag, page title, and sourced parking answer before JavaScript.
- `sitemap.xml` contained 3,731 URLs; Dix Park used evidence-derived `lastmod` `2026-08-05` rather than the deployment date.
- Hosted `app.js` contained the directions-return contribution invitation and hosted `styles.css` contained its responsive presentation rules.
- The return invitation waits at least 15 seconds, expires within 24 hours, does not claim a visit occurred, and preserves an exact subsite target when directions began from a subsite card.
- Campaign analytics distinguish return invitations shown, accepted, and dismissed; the experiment evaluator reports acceptance rate without treating an invitation as a completed contribution.
- The hosted experiment contains both session-stable messages: `help-next-person` and `leave-breadcrumb`. Campaign and organic events carry the variant but no user identifier or precise location.
- The hosted saved-list loop contains the public-place ID sanitizer, 12-place cap, `saved_list_loop` referral attribution, recipient explanation, save-all behavior, distribution/landing/retention events, and responsive controls.
- The hosted Raleigh planning campaign contains three sourced, image-rights-checked shared lists, unique creative attribution, a canonical curated landing page, and direct handoffs into the saved-list loop.
- The hosted saved-list funnel records guide opens separately from list landings, allowing the planning evaluator to distinguish a weak post from an unhelpful collection.
- Security headers included `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`.
- The Vercel image optimizer returned `HTTP 200`, `image/jpeg`, and a valid 73,580-byte image for the Raleigh campaign hero.
- `/api/knowledge?placeId=dix-park` returned `HTTP 200`, an empty catalogue with no database configured, and no `needs_verification` draft leakage.
- Vercel reported no error-level runtime logs after the validation requests.

## Local Visual Evidence

- The Raleigh landing was checked at 390 pixels with seven cards, no horizontal overflow, and no broken visible image.
- The landing was checked at 1,280 pixels with seven cards, no horizontal overflow, and no broken visible image.
- The tracked contribution link preserved campaign parameters and opened the account-protected contribution path.
- The directions-return invitation was triggered from the rendered Dix Park address control with no console errors. Its deterministic timing, privacy, expiry, subsite-targeting, analytics, and phone-width contracts pass `npm run test:directions-return-loop`.
- A three-place Raleigh list opened automatically at 390 pixels with no horizontal overflow. “Save all places” retained all three destinations and returned `3 places saved.` with no console errors. Its sharing, recipient, retention, measurement, and privacy contracts pass `npm run test:saved-list-loop`.
- The planning landing rendered three cards at 390 pixels with no horizontal overflow or console errors. Its first link preserved `raleigh_planning_pilot`, opened the exact Dix–Pullen–Chavis collection, and rendered three recipient rows. Campaign generation and evidence contracts pass `npm run verify:planning:raleigh`.

The browser used for visual testing is logged into a different Vercel account than the deployment owner. It correctly reached the protected-access page rather than bypassing protection. Visual preview checks therefore combine local browser evidence with authenticated raw Vercel and image-pipeline checks.

## Intentionally Unproven

- Preview authentication and Supabase are not configured. `GET /api/auth?action=config` returned `HTTP 503` with `configured: false`.
- `vercel env ls preview` confirmed that the project has no Preview environment variables.
- Authenticated Info gaps, answer approval, Follow-ups, Crumb persistence, and moderation database writes were not exercised.
- No schema was applied and no live database record was modified.
- No campaign post was published and no real conversion data exists yet.

## Explorer Passport UX Preview

- Protected preview: `https://auditmap-dvipwwpb8-derrys-projects-f5a18cb6.vercel.app/discover/raleigh/passport/`
- Scope: passport-only deployment for fast UX validation; this is not the nationwide application bundle and was not promoted to production.
- Hosted HTML returned `HTTP 200`, contained all five allowlisted Raleigh cards, factual visitor framing, canonical metadata, licensed photo credits, progress controls, guide links, and breadcrumb handoffs.
- Hosted JavaScript and CSS rendered from the deployment, and the John Winters local image returned a valid JPEG response.
- Automated contracts passed for local-only progress, shared-progress isolation, ID allowlisting and caps, no geolocation, event instrumentation, image rights, and phone breakpoint rules.
- The in-app browser could not pass the protected-preview navigation gate, so click-level and screenshot evidence remain pending. No visual-interaction pass is claimed.
- The directions-return invitation has no real acceptance or Crumb-completion baseline yet.

## Explorer Passport Attribution Refresh

- Protected preview: `https://auditmap-cwtrdv3dn-derrys-projects-f5a18cb6.vercel.app/discover/raleigh/passport/`
- Deployment ID: `dpl_83wyjj2wx37B6ni76CYM6wz8CJpD`
- Scope: lightweight passport-only preview; production was not changed.
- The final passport route returned `HTTP 200` after its canonical slash redirect.
- Hosted `explorer-passport.js` contains the three allowlisted distribution message IDs, anonymous `content` attribution, referral suffix continuity, the breadcrumb destination handoff, and once-per-session landing/referral measurement to reduce refresh inflation.
- Local tests cover message-level event import, preservation of unknown external metrics, character limits, decision rules, image rights, sharing, and privacy boundaries.

## Integrated Passport Release Candidate

- Protected preview: `https://auditmap-jkpujvr87-derrys-projects-f5a18cb6.vercel.app/discover/raleigh/passport/`
- Deployment ID: `dpl_7DbZeDZC3qsz6koLSCSeWwtE38Zd`
- Scope: passport, five Raleigh parent park pages, contribution runtime, five-place data subset, and 96 referenced local image assets. Nationwide pages are intentionally excluded, so this preview must not be promoted to production.
- All six canonical preview routes returned HTTP 200. The tracked stewardship handoff to Dix Park also returned HTTP 200 and contained the discussion surface plus `app.js`.
- Hosted JavaScript preserves the allowlisted originating message across every park-guide and breadcrumb link while carrying the public park ID separately as `utm_term`.
- Hosted John Winters media returned HTTP 200 as JPEG, and a representative local Dix image returned HTTP 200 through Vercel's image optimizer.
- At a 390-pixel viewport, marking Dix changed progress to `1 of 5`, revealed the breadcrumb action, retained local progress, and produced no horizontal overflow.
- Every Dix guide and breadcrumb URL retained `utm_content=leave_a_breadcrumb` and `utm_term=dix-park` after the interaction.
- The tracked Dix contribution URL opened the account handoff for an unsigned visitor. The Crumb dialog did not falsely open without authentication.
- Preview auth returned HTTP 503 with `configured: false`. No account sign-in, database persistence, moderation write, or completed contribution is claimed.

## Next Safe Step

The Raleigh Passport campaign has an additional release gate: its canonical production destination returned HTTP 404 on August 7, 2026. The prepared X variants must not be published until a maintainer deploys the integrated application and `npm run verify:passport:raleigh:production` returns `ready: true`. The handoff is documented in `docs/marketing/raleigh-passport-release-handoff.md`.

Create a non-production Supabase project or isolated preview schema, add only Preview-scoped Vercel variables, apply the reviewed schema there, and seed synthetic institutions, information needs, and moderator accounts. Then test:

1. AI response saved as `needs_verification` and kept out of reusable knowledge.
2. Repeated questions deduplicated and counted toward enrichment.
3. Moderator approval rejected without a public source.
4. Sourced approval entered the public knowledge catalogue and Follow-ups queue.
5. Read-only export updated static HTML and evidence-derived sitemap freshness.

Production credentials or production database access are not required for this validation.
