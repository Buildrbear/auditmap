# Raleigh Discovery-to-Contribution Pilot

## Assignment

- Goal: test repeatable discovery loops until AuditMap finds a useful, sustainable growth model.
- Scope: Raleigh, North Carolina; seven organic X posts; one discovery landing page; existing place pages and Crumb contribution flow.
- GitHub issue: not supplied.
- OpenTask assignment: not supplied.
- Publication state: review only. A maintainer must review each post and choose whether to publish it.

## Hypothesis

Useful, geographically specific posts can bring Raleigh residents to a public-place guide. A small prompt tied to that exact place can then convert some visitors from readers into explorers, savers, navigators, sharers, or contributors. Accepted contributions make the guide more useful and create material for another discovery post.

The loop is:

1. Publish one practical Raleigh discovery with a tracked place link.
2. Help the visitor decide whether and how to go.
3. Offer navigation, saving, sharing, and one place-specific contribution action.
4. Review submitted Crumbs as community observations, questions, corrections, or evidence.
5. Use accepted information to improve the place record and inform a later post.

## National Brand, Local Utility

AuditMap should use one national social identity rather than separate accounts for every city. Each post can still feel local because its link carries the city, place, visitor intent, and campaign attribution into a geographically relevant page. The landing experience should use the visitor's chosen or approximate area when available, while always offering a clear city search instead of assuming Raleigh.

This builds on the strongest parts of the established outdoor-discovery model:

1. Maintain a crawlable hierarchy from country to state to city to place to subsite.
2. Give every destination one useful, shareable page with practical planning details and real photographs.
3. Organize places into human-readable collections such as kid-friendly, accessible, dog-friendly, hidden gems, water play, public art, and shaded walks.
4. Let one national account publish local discoveries from every covered market.
5. Ask for a small contribution after discovery or navigation: add a photo, report a condition, answer a question, correct a detail, or pin a missing feature.
6. Review that contribution, improve the permanent record, and turn the improvement into the next local discovery.

AuditMap's differentiation is the last step. A community response is not left as isolated review text. It becomes a dated observation, an unresolved question, or a source-backed answer that can improve the destination page for the next visitor.

The repeatable growth loop is:

`local discovery -> useful place page -> visit intent -> breadcrumb contribution -> reviewed knowledge -> stronger page -> new discovery`

Do not open a city-specific account until a market has enough recurring local activity to support its own editorial calendar and moderation. Even then, treat it as a community chapter that amplifies the national record rather than a separate database or brand.

## Seven-Day Test

The source campaign is `data/discovery-campaigns/raleigh-pilot.json`. Run `npm run generate:discovery:raleigh` to rebuild:

- `discover/raleigh/index.html`
- `data/generated/discovery-campaigns/raleigh-discovery-pilot.json`
- `preview/raleigh-discovery-pilot-social-queue.md`

The queue covers arrival, accessibility, shade, and overlooked-place discovery at Dix Park, John Chavis Memorial Park, Moore Square, and John Winters Park. Every draft has a cited answer, checked date, reusable image license, attribution, visual-match explanation, and unique campaign URL.

Before posting, a person must recheck the cited page, confirm the photograph still matches the words, review the tone, and verify any fast-changing condition. Do not automatically publish the queue.

## Measurement

Vercel page views provide reach. AuditMap records these custom events with campaign attribution when available:

| Funnel stage | Event | What it answers |
| --- | --- | --- |
| Interest | `Discovery click` | Which discovery made someone open a place or contribution path? |
| Planning | `Place saved` | Did the visitor intend to return? |
| Visit intent | `Directions opened` | Did the guide help someone start a visit? |
| Distribution | `Place shared` | Did a visitor pass the place to someone else? |
| Contribution intent | `Crumb started` | Did the visitor try to improve the place? |
| Contribution completion | `Crumb submitted` | Did a moderated contribution reach the review system? |
| Return invitation | `Return contribution prompt shown` | Did a directions user return while the invitation was still relevant? |
| Return response | `Return contribution prompt accepted` | Did the invitation create contribution intent? |
| Return rejection | `Return contribution prompt dismissed` | Was the invitation unwanted or poorly timed? |

The primary metric is **useful actions per 100 attributed place-page visits**, where a useful action is a save, directions open, share, or Crumb submission. The secondary metric is **Crumb completion rate**, calculated as submissions divided by starts.

Record native X impressions, profile visits, reposts, replies, and follows manually beside each post. Treat them as diagnostic signals, not the primary success measure.

Enter cumulative numbers in `data/discovery-campaigns/raleigh-pilot-results.json`. Each completed checkpoint requires:

- `socialImpressions` and `socialEngagements` from X
- `attributedVisits`, `saves`, `directions`, `shares`, `crumbStarts`, and `crumbSubmissions` from AuditMap analytics
- `returnPromptShown`, `returnPromptAccepted`, and `returnPromptDismissed` from the directions-return experiment
- `returnPromptVariants` split between `help-next-person` and `leave-breadcrumb`; its totals must match the three aggregate return-prompt counts
- `nonTeamResponses`, counting genuine replies or contributions and excluding the AuditMap team

Keep an uncollected checkpoint as `null`; zero means the metric was checked and no event occurred. Run `npm run evaluate:discovery:raleigh:24h` after the first checkpoint and `npm run evaluate:discovery:raleigh` after seven days.

The return invitation assigns one of two messages for the browser session. Both variants use the same 15-second eligibility delay, 24-hour expiry, placement, and contribution flow. Compare their acceptance rates only after both have meaningful exposure; do not declare a winner from a handful of prompts.

## Decision Rules

- Repeat a format when it produces at least one non-team response or contribution and its useful-action rate is at or above the campaign median.
- Rewrite a post that earns clicks but no useful actions; the page or promise may not satisfy the visitor's intent.
- Retire a format that remains below the campaign median after comparable distribution.
- Turn repeated public questions into a sourced answer or an unresolved information need, not an unsupported social reply.
- Do not expand to another city until the workflow can be run without weakening source, image-rights, privacy, or moderation checks.
- A first-round post cannot receive `retire-format`; retirement requires comparable reach and below-median performance after another round.

## Trust And Safety

- Campaign attribution is stored for the browser session and contains only sanitized UTM labels. Custom events do not include precise visitor coordinates, email addresses, or user IDs.
- The campaign deep link opens the existing account and moderation path. It does not bypass authentication or publish a Crumb as a verified fact.
- Official facts, community observations, editorial synthesis, and unknowns remain separate evidence classes.
- Every campaign image is Creative Commons licensed and linked to its source page. The generator rejects unclear reuse terms and missing attribution.
- Every post includes a manual visual-match statement. A general park photograph must not stand in for a specific feature that it does not show.

## Sources And Image Rights

The generated review queue contains the exact source, checked date, creator, image license, source page, and visual-match review for every post. The current evidence uses official City of Raleigh place information, Raleigh parking information, and Creative Commons media from Wikimedia Commons or LocalWiki.

No Google, Yelp, Wanderlog, or other proprietary review text, rating, photograph, or bulk location record is used in this campaign.

## Verification Evidence

- `npm run generate:discovery:raleigh`
- `npm run verify:discovery:raleigh`
- `npm run test:discovery-experiment`
- `npm run evaluate:discovery:raleigh` produces an honest awaiting-results report while checkpoints remain `null`
- JavaScript syntax checks for the generator, verifier, landing behavior, and destination behavior
- Browser check at 390 pixels: seven cards, no horizontal overflow, no broken visible image, and a working tracked contribution handoff
- Browser check at 1280 pixels: seven cards, no horizontal overflow, and no broken visible image
- The contribution handoff preserved `utm_campaign` and `utm_content` and opened the existing account-protected contribution flow

Final image-optimizer validation still belongs on the Vercel pull-request preview.

## Unresolved Review Queue

| Place or surface | Field or feature | Conflict or missing evidence | Sources checked | Recommended next action |
| --- | --- | --- | --- | --- |
| Raleigh pilot | Assignment | GitHub issue and OpenTask links were not supplied | Repository contribution rules | Attach both links before submitting the delivery package |
| Raleigh pilot | Preview | No Vercel pull-request preview exists yet | Local phone and desktop previews | Validate optimized images and the complete journey on the PR preview |
| All campaign posts | Freshness | A checked fact can change between generation and publication | Cited source in each queue entry | Reopen the cited source on posting day |
| Campaign results | Organic reach | Native X impressions and replies are not available inside AuditMap | X account analytics after publication | Record results manually after 24 hours and seven days |
| Contributions | Quality | The first useful-action and completion baselines are unknown | Vercel events and moderation queue after launch | Establish a baseline before setting absolute growth targets |
