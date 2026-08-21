# Question-to-Answer Growth Loop

## Purpose

AuditMap should become more useful every time a visitor asks a practical question. AI may help the current visitor immediately, but only a reviewed, source-backed answer may become reusable AuditMap knowledge or promotional material.

## Loop

1. A visitor asks a question on a place or subsite page.
2. AuditMap normalizes the question into an intent and deduplicates it against existing information needs for that place.
3. Ask AuditMap responds immediately from current structured facts, reviewed community context, and cited AI synthesis when enabled.
4. An AI-generated answer is saved as `needs_verification`, remains `open`, and cannot appear in the public knowledge catalogue.
5. Repeated unanswered or unreviewed questions continue to count toward the enrichment threshold instead of being suppressed by the AI draft.
6. The private review inbox shows the question, draft answer, and public sources. A reviewer may approve only when a direct answer and at least one public source are present.
7. Approval changes the answer to reusable knowledge and adds a private follow-up opportunity.
8. A read-only export writes approved answers to `data/reviewed-knowledge.json` for repository review.
9. The static generator overlays accepted answers onto the matching place, refreshes raw HTML and the official catalogue, and advances only the affected page and hub sitemap dates.
10. The Follow-ups tab creates a concise, tracked `#AnsweredByAuditMap` draft. A person reviews and publishes it separately.
11. The follow-up brings new visitors to the improved place page, where new questions begin the next cycle.

## Evidence Rules

- AI output is assistance, not evidence.
- The immediate AI response must distinguish sourced records from community observations and uncertainty.
- A reusable answer requires a direct answer, public source URL, explicit moderator approval, freshness date, and non-expired status.
- `needs_verification` drafts are excluded from `GET /api/knowledge` and from `currentKnowledge()` reuse.
- A repeated question with an unreviewed AI draft remains eligible for enrichment.
- Follow-up drafts are generated only from records with `status=answered`, `answer_status=answered|partial`, at least one public source, and `metadata.followUpStatus=queued`.
- Copying or preparing a follow-up never publishes it automatically.
- The static build rejects unapproved, unsourced, expired, future-dated, duplicated, or unknown-place export records.

## Operations

- Review information gaps in `admin.html` under **Info gaps**.
- Inspect every linked source before choosing **Approve sourced answer**.
- Review approved opportunities under **Follow-ups**.
- Use **Copy draft**, edit for current conditions and tone, then post manually.
- Choose **Mark prepared** only after the draft has entered the human publishing workflow.
- Monitor the `answered_by_auditmap` campaign separately from the Raleigh discovery pilot.
- Run `npm run export:reviewed-knowledge` with reviewed read-only database access, inspect the JSON diff, then run `npm run generate`.
- Never use the export command to modify the live database; it performs GET requests and writes only the local review artifact.

## Verification

Run:

```bash
npm run test:question-loop
npm run test:reviewed-knowledge
npm run generate
npm run verify:nc:generated
```

The checks cover AI-draft isolation, current-knowledge quality, schema deduplication behavior, approval requirements, follow-up eligibility, canonical place links, tracking parameters, post-length limits, raw static HTML publication, official-catalogue publication, and page-specific sitemap freshness.

## Remaining Work

- Run the schema update through the normal reviewed migration process; do not edit production directly.
- Validate the authenticated Info gaps and Follow-ups tabs on a Vercel preview connected to a non-production database. The August 7 preview proved the static and image layers, but Preview currently has no environment variables; see `docs/marketing/preview-validation-2026-08-07.md`.
- Compare `answered_by_auditmap` useful-action rates with the general Raleigh discovery campaign before scaling the format.
