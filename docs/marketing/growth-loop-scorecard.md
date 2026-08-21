# Growth-loop Scorecard

AuditMap should not choose a growth model from impressions alone. The shared scorecard compares seven loops through a common progression: distribution, meaningful activation, return use, and contribution to the public record.

## Current Loops

1. Place discovery brings a person from search or social into one useful guide.
2. Shared planning lists bring another person into choosing an outing together.
3. Verified answer sharing sends one exact sourced answer to someone who needs it.
4. Directions-return invitations ask an explorer to leave a useful breadcrumb after navigating.
5. Question-to-reviewed-answer turns unmet demand into a stronger reusable park record.
6. Explorer passports turn intentional place check-ins into visible progress, sharing, and useful breadcrumbs.
7. Community questions turn a named local information gap into a sourced answer returned publicly to the person who raised it.

## Operating Rule

Update `data/growth-loops/loop-results.json` after the same 24-hour or seven-day window for each live test, then run `npm run evaluate:growth-loops`. Null means data has not been collected. Zero means the metric was checked and no event happened.

The evaluator deliberately does not invent one blended vanity score. A loop can earn `SCALE CAREFULLY` only after producing a contribution that improves the public record. Weak distribution and a weak promise receive different diagnoses so the team fixes the correct part of the funnel.

The national daily campaign is an experiment within the place-discovery loop, not a separate loop category. After importing its campaign results, run `npm run sync:daily-discovery:national:scorecard -- 24h` or `7d`, then evaluate the shared scorecard. The report also reads the dated production validation and names the immediate launch action; it must not recommend running Day 1 when either content or measurement is unready.

The community-question loop has an additional closure gate: improving an answer is not enough. AuditMap must return the answer publicly before the scorecard can recommend scaling. Reusing an existing sourced answer can prove utility, but it is not counted as a record-improving contribution.

Do not infer visits from directions, accuracy from shares, or satisfaction from page views. Compare loops only after similar distribution and time windows.

Passport marks per open and referral opens per share can exceed 100%. One explorer may mark several places, and one shared passport may reach several recipients. Passport landing and referral events are session-deduplicated; positive markings count as activation while unmarking does not.

## Event Import

AuditMap events include a normalized `loop` and `stage` property. An attributed landing is recorded once per campaign, page, and browser session. No visitor ID or precise location is added.

Export custom events from Vercel as JSON, then run `npm run import:growth-loop-events -- path/to/export.json 24h` followed by `npm run evaluate:growth-loops`. The importer accepts either a JSON array or `{ "events": [] }`, and recognizes `name`, `event`, or `eventName` plus `properties` or `props`.

Counts represent events, not unique people. Social impressions remain external and should be represented as `Campaign impression` events in a combined export when available; otherwise the discovery exposure denominator remains zero and the scorecard will correctly diagnose missing distribution data.
