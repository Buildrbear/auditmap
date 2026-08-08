# National Daily Discovery Release Handoff

## Candidate

- Protected preview: `https://auditmap-a2pdo6g81-derrys-projects-f5a18cb6.vercel.app`
- Deployment: `dpl_DQWDCRTZbjFPtu1iGRPQsCGo8xFV`
- Scope: 14 exact campaign destination pages, 14 matching place records, 153 local media assets, APIs, and the current interaction runtime
- Production publication: not performed
- Preview database credentials: not added

## Verified 2026-08-07

`npm run verify:daily-discovery:national:preview -- https://auditmap-a2pdo6g81-derrys-projects-f5a18cb6.vercel.app`

- 14/14 tracked destination pages returned HTTP 200 through authenticated Vercel requests.
- Every page contained the correct place name, canonical path, indexable raw HTML, and exact cited source.
- The deployed `app.js` contained campaign landing, save, directions, share, Crumb submission, and shared attribution tracking.
- Result: content ready, measurement ready, candidate ready.

The dated machine-readable evidence is `preview/national-daily-discovery-preview-validation.json`.

## Public-site Difference

`npm run verify:daily-discovery:national:production` was rerun on 2026-08-07.

- 14/14 destination pages passed the content gate.
- Production measurement failed because public `app.js` does not yet contain the current AuditMap event runtime.
- The campaign must remain unposted until the production verifier reports both `contentReady: true` and `measurementReady: true`.

The dated public-site evidence is `preview/national-daily-discovery-production-validation.json`.

## Maintainer Release Sequence

1. Review the candidate deployment and its intentionally limited scope.
2. Release the current interaction runtime through the normal production process; do not replace the nationwide site with this limited preview package.
3. Run `npm run verify:daily-discovery:national:production` and require a zero exit with `ready: true`.
4. Recheck the Day 1 destination fact, closure status, and photograph rights on publication day.
5. Publish only the approved Day 1 post from `preview/national-daily-discovery-launch.md`.
6. Import reviewed X and AuditMap measurements at 24 hours, then evaluate before continuing the rotation.

## Rollback Rule

If the public runtime causes navigation, place-page, analytics, or contribution regressions, use the normal Vercel rollback process and pause the campaign. Never keep posting while attribution is absent or ambiguous.
