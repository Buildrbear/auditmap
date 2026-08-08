# Raleigh Explorer Passport Release Handoff

## Current State

- The local passport, campaign variants, attribution, event importer, scorecard, and launch brief pass their automated checks.
- Protected passport-only preview: `https://auditmap-cwtrdv3dn-derrys-projects-f5a18cb6.vercel.app/discover/raleigh/passport/`
- Production destination: `https://www.auditmap.org/discover/raleigh/passport/`
- Production result checked August 7, 2026: HTTP 404.
- Integrated protected release candidate: `https://auditmap-jkpujvr87-derrys-projects-f5a18cb6.vercel.app/discover/raleigh/passport/` (`dpl_7DbZeDZC3qsz6koLSCSeWwtE38Zd`).
- Campaign status: `awaiting-production`.
- No X post has been published and no production deployment has been performed by the agent.

## Maintainer Release Order

1. Run `npm run build:passport:raleigh:preview` and deploy the generated temporary package as a protected release candidate. This package includes the passport, its five parent park pages, contribution runtime, and referenced local assets without the nationwide payload.
2. Verify passport → park guide → breadcrumb form handoff on that release candidate. Database persistence remains unproven unless maintainers deliberately add isolated Preview-scoped credentials.
3. Review the current integrated workspace and deploy it through the normal AuditMap production process. Do not promote either reduced preview package because each intentionally excludes nationwide pages.
4. Run `npm run verify:passport:raleigh:production` against the canonical domain.
5. Confirm the command returns `ready: true`, HTTP 200, five passport cards, and the instrumented script.
6. Change `status` in `data/discovery-campaigns/raleigh-passport-pilot.json` from `awaiting-production` to `ready`.
7. Run `npm run prepare:passport:raleigh`, `npm run test:passport-launch`, `npm run test:passport-distribution`, and `npm run test:passport-attribution`.
8. Review `preview/raleigh-passport-pilot-launch.md` and publish only the first approved variant.

## Measurement Order

1. Record the first post's X impressions and engagements at 24 hours.
2. Export matching AuditMap events and run `npm run import:passport:raleigh -- path/to/export.json 24h`.
3. Enter confirmed non-team responses, leaving unknown values `null`.
4. Run `npm run evaluate:passport:raleigh:24h`.
5. Repeat for the other two variants 48 hours apart at the same Raleigh local time.
6. Record cumulative seven-day data and run `npm run evaluate:passport:raleigh`.

Do not select a winner from impressions alone. Prefer meaningful place markings and shares, but require a submitted Crumb before using `repeat-and-expand`.
