# National Daily Public-place Loop

## Purpose

Build national recognition through one AuditMap account while giving each post a genuinely local destination and useful sourced detail.

`current sourced place fact + reusable real photograph -> national daily post -> local guide visit -> visitor question or breadcrumb -> stronger place record -> future post or answer share`

## Controls

- One city and state per post; the first rotation uses 14 distinct states across all four U.S. Census regions.
- Real photographs only, with a reusable license, creator, source page, and alt text.
- Facts require a source label, public URL, checked date, and unexpired answer when an expiry exists.
- The generator excludes missing local pages and captions over X's limit.
- Nothing posts automatically. A reviewer rechecks freshness, closures, image rights, tone, and the live destination on publication day.
- Keep the first-round framing fixed. Measure local response rather than changing artwork, hook, city, and fact simultaneously.
- Keep the approved destination order in `data/discovery-campaigns/national-daily-discovery-cohort.json`. If a member stops qualifying, generation fails with its ID instead of silently substituting a different park.

Run `npm run prepare:daily-discovery:national` and `npm run test:daily-discovery:national`. The generated review queue lives at `preview/national-daily-discovery-launch.md`.

Run `npm run prepare:daily-discovery:national:day1` for the focused publication card at `preview/national-daily-day1-approval.md`. It remains `HOLD` unless schedule, fact freshness, image rights, public content, and production measurement all pass. `READY FOR HUMAN REVIEW` is not automatic publication; same-day conditions still require a person.

Each post has a place-stable ID shared by its `utm_content` value and results record. The schedule's day or date can change without changing attribution for that destination. Export AuditMap events as either an array or `{ "events": [...] }`. To initialize a checkpoint without hand-editing every site metric, include a reviewed `social` array containing each post's `id`, `socialImpressions`, `socialEngagements`, and `nonTeamResponses`. Missing social measurements stop the import rather than becoming false zeroes.

Run `npm run import:daily-discovery:national -- path/to/export.json 24h` or substitute `7d`, then run:

- `npm run evaluate:daily-discovery:national:24h` after the first full day
- `npm run evaluate:daily-discovery:national` after seven days

The evaluator compares useful actions per attributed visit rather than raw impressions alone. A post earns a repeat when it produces a non-team response or contribution and meets the campaign's median rate of saves, directions, shares, and completed breadcrumbs. Low distribution is marked insufficient rather than misread as weak creative.

Run `npm run verify:daily-discovery:national:production` immediately before approving the rotation. Every tracked destination must return HTTP 200, the correct place name, canonical metadata, an indexable page, and the exact cited source in raw HTML. Production `app.js` must also contain campaign-landing, save, directions, share, and completed-Crumb events. A failed day is skipped or repaired; it is never redirected to a generic map or homepage. Content readiness without measurement readiness is not a launch-ready loop.

The verifier writes `preview/national-daily-discovery-production-validation.json` so launch readiness is dated and reviewable rather than remembered from terminal output. A passing batch still remains human-reviewed: recheck same-day closures and confirm that the selected photograph accurately depicts the named destination before posting.

The protected release candidate and production difference are recorded in `docs/marketing/national-daily-discovery-release-handoff.md`. The preview package is deliberately limited and must not replace the complete nationwide production site; it proves the campaign pages and runtime before the current runtime is released through the normal production process.

## Operating Rhythm

1. Publish from one national AuditMap account, rotating geographically rather than opening city-specific accounts.
2. Use one useful, sourced local detail and one real licensed photograph to earn the click.
3. Send the visitor to the exact place page, where saves, directions, questions, and breadcrumbs can deepen the record.
4. Read the 24-hour result as an early distribution check, not a final judgment.
5. At seven days, repeat the places and facts that caused useful action; rewrite posts that attracted visits but no action.
6. Turn strong local response into follow-up lists and city clusters only after the national account demonstrates demand.
