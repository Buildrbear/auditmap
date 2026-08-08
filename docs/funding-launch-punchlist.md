# AuditMap Funding Launch Punchlist

## Already Working

- Place pages show one proposed, costed public-work milestone.
- The first milestone is selected from visible information gaps.
- Visitors can preview contribution amounts and register interest without being charged.
- Interest is stored locally for UX testing and clearly labeled as non-payment data.
- Compatably, LLC and non-tax-deductible language appear before submission.
- Supabase schema definitions cover campaigns, milestones, interest, confirmed payments, and public updates.

## Founder Setup

These items require access to Compatably, LLC accounts or a business decision from Michael.

- Confirm the Compatably bank account can receive payouts for AuditMap support.
- Create or select the Stripe account that will operate under Compatably, LLC.
- Confirm the public statement descriptor supporters should see on card statements.
- Choose a support email for receipts, refunds, and campaign questions.
- Confirm whether AuditMap is a Compatably product name or will use a separate DBA.
- Have an accountant confirm sales-tax and income-bookkeeping treatment for backing and sponsorship revenue.
- Have counsel or a qualified advisor review the support language, terms, privacy notice, refund policy, and campaign reallocation policy.

## Policies Required Before Payments

- **Refund policy:** Define when a supporter may request a refund and how processed work affects eligibility.
- **Underfunding policy:** State whether funds wait for the milestone, roll to related public work, or are refunded after a deadline.
- **Overfunding policy:** State that excess funds support the next published milestone or the broader public coverage pool.
- **Cancellation policy:** Define what happens if field access, licensing, safety, or feasibility prevents fulfillment.
- **Timeline policy:** Give estimates as targets, not guarantees, and require public delay updates.
- **Editorial independence:** State that backing changes work priority but cannot purchase a factual conclusion or moderation outcome.
- **Privacy policy:** Explain how supporter email, name, note, and payment-provider data are used and retained.

## Implementation After Accounts Are Ready

Account readiness now means Google and GitHub OAuth plus email-link sign-in all resolve to a stable
Supabase user UUID. Funding interest and confirmed contribution records may reference that UUID,
but it remains nullable so a supporter can check out as a guest. Never match payments to accounts by
email address alone.

1. Create campaigns and milestones in Supabase for 10 pilot park pages.
2. Replace local interest storage with a server endpoint and rate limiting.
3. Add an admin campaign screen for status, targets, updates, refunds, and fulfillment notes.
4. Connect Stripe Checkout using one-time payments only.
5. Confirm payments through signed webhooks before increasing public totals.
6. Add receipts, supporter visibility choices, and a public campaign update ledger.
7. Run one internal $1 payment and refund test in Stripe test mode.
8. Complete one manually funded milestone before opening a broad public campaign.

## Pilot Measurement

For each of the first 20 completed work packages, record:

- direct research or fieldwork time
- travel and equipment cost
- compute and media-storage cost
- moderation and quality-review time
- payment fees and refunds
- time from funding to publication
- supporter conversion and average contribution
- whether the published result matched the promised deliverable

Do not publish larger packages or city-wide targets until these measurements show what AuditMap can reliably deliver and at what cost.
