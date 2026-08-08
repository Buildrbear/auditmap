# Verified Answer Sharing Loop

## Hypothesis

A visitor who finds a precise sourced answer about parking, restrooms, accessibility, fees, entrances, or another practical intent may send that exact answer to a family member or friend. The recipient lands on the authoritative place page, sees the answer and its source in context, and can ask a follow-up or contribute a correction.

The loop is:

`search or question -> sourced answer -> share exact answer -> recipient opens place -> follow-up or contribution -> reviewed update -> stronger answer`

## Trust Boundary

- Static answer controls are generated only when the answer has a public source.
- Live database answers are shareable only when `answer_status` is `answered` and at least one source is present.
- Partial answers, AI drafts, and `needs_verification` responses do not receive a share control.
- The shared message links to the answer; it does not copy potentially stale answer text into the social payload.
- The destination remains the canonical park or subsite page. No separate indexed long-tail answer page is created.

## Measurement

| Stage | Event | Meaning |
| --- | --- | --- |
| Distribution | `Verified answer shared` | Someone intentionally shared or copied an exact sourced answer. |
| Referral | `Shared answer opened` | A recipient opened the attributed answer fragment. |
| Inquiry | `Crumb started` with question | The answer led to a follow-up. |
| Correction | `Crumb submitted` | The recipient supplied context, confirmation, or a correction. |
| Publication | reviewed knowledge export | Accepted evidence improved the static answer and sitemap freshness. |

Primary metrics are opens per share and follow-ups or contributions per shared-answer open. Never count a share or open as evidence that the underlying fact is accurate.

## Verification

- `npm run test:verified-answer-loop`
- Raw Dix Park HTML contains a unique question-specific parking fragment and a source-gated share action before JavaScript.
- An attributed answer URL opens the matching disclosure and records the landing.
- Phone and desktop checks confirm the action fits the existing answer controls.
