# Raleigh Explorer Passport Loop

## Hypothesis

Visible, self-reported exploration progress can encourage someone to try another public place and invite a friend without requiring GPS tracking, an account, or a competitive leaderboard.

The loop is:

`discover passport -> open a guide -> explicitly mark a place explored -> see progress -> leave a useful breadcrumb -> share progress -> recipient starts a separate passport`

## Product Boundaries

- AuditMap never infers a visit from location, directions, page views, or time on page.
- “I've explored this” is an explicit visitor action and can be undone.
- Personal progress stays in local browser storage unless the visitor chooses to share it.
- A shared URL contains only allowlisted public place IDs, capped to the five-place passport.
- Shared progress remains the sender's story. It does not merge into the recipient's history.
- The recipient can view the shared passport without an account and deliberately start a separate one.
- No GPS, visitor identity, precise location, visit timestamp, or route history is collected.
- Each image has a reusable license and visible source attribution.

## Raleigh Test

The first passport intentionally mixes different kinds of public-space experiences: Dix Park, Pullen Park, John Chavis Memorial Park, Moore Square, and John Winters Park. The test is not “complete every famous park.” It is whether visible progress helps people notice and explore a wider range of public resources.

## Measurement

| Stage | Event | Meaning |
| --- | --- | --- |
| Landing | `Explorer passport opened` | Someone opened their own passport. |
| Activation | `Explorer place marked` | Someone explicitly changed a place's explored state. |
| Contribution intent | `Explorer contribution opened` | An explorer followed the breadcrumb handoff. |
| Contribution | `Crumb submitted` | The explorer actually submitted information for moderation. |
| Distribution | `Explorer progress shared` | Someone intentionally shared or copied progress. |
| Referral | `Shared passport opened` | A recipient viewed shared progress. |

Primary signals are place markings per passport open, shares per passport open, shared opens per share, and completed contributions per place marked. Contribution-form opens are diagnostic only and never count as record improvement. A marking is self-reported and must not be represented as verified presence.

Passport and shared-passport opens are counted once per browser session and message variant to reduce refresh inflation. Positive place markings count as activation; unmarking does not. Marks per open and referral opens per share may legitimately exceed 100% because one explorer can mark several places and one shared link can reach several recipients.

Run `npm run generate:passport:raleigh` and `npm run test:passport-loop`. The loop is included in the shared growth scorecard and event importer.

## Distribution Pilot

The first distribution round tests three distinct reasons to open the same passport: curiosity and progress, companionship, and public-space stewardship. The review-only copy lives in `data/discovery-campaigns/raleigh-passport-pilot.json`; no post is published automatically.

Each variant uses the same destination with a unique `utm_content` value. Record X-side distribution and AuditMap-side behavior at 24 hours and seven days in `data/discovery-campaigns/raleigh-passport-pilot-results.json`. Keep uncollected checkpoints `null` rather than converting unknowns to zero.

Run `npm run evaluate:passport:raleigh:24h` and `npm run evaluate:passport:raleigh`. A variant earns `repeat-and-expand` only after an actual submitted Crumb. A contribution-form open is intent, not a contribution.

Run `npm run prepare:passport:raleigh` to regenerate the review sheet with exact tagged destinations, X composer links, posting controls, and character checks. The first round holds the visual constant so the comparison tests the three motivations rather than three unrelated creative packages.

The passport carries only the allowlisted message ID into anonymous event properties and through every park-guide and breadcrumb handoff. The public park ID travels separately as `utm_term`, preventing a guide click from replacing the motivating message. It does not add identity, GPS, or visit timestamps. Export the campaign events and run `npm run import:passport:raleigh -- path/to/export.json 24h` (or `7d`) to populate AuditMap-side counts by message. X impressions, X engagements, and confirmed non-team responses remain `null` until entered from their authoritative sources.

## Launch Gate

The canonical campaign destination must be public before distribution. Run `npm run verify:passport:raleigh:launch` for the local release contract and `npm run verify:passport:raleigh:production` for the live HTTP gate. The campaign must remain `awaiting-production`, and no prepared post should be published, until the remote verifier returns `ready: true`. On August 7, 2026, the production passport route returned HTTP 404; the protected preview is not a substitute for a publicly reachable campaign destination.
