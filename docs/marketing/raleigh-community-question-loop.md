# Raleigh Community-question Loop

## Hypothesis

A specific public question can turn social attention into reusable local knowledge when AuditMap publicly returns a sourced answer instead of merely collecting engagement.

`ask for one place plus one missing detail -> qualify the visitor need -> research and publish a sourced answer -> reply publicly -> respondent or observer shares the useful answer`

## Trust Boundary

- Do not scrape replies or store social handles.
- Record aggregate counts and reviewer-written paraphrases only.
- A qualified need must identify a real public place and a concrete visitor question.
- A social reply is demand evidence, not factual evidence.
- Published answers still require AuditMap's normal official-source and review standards.
- Raw impressions, likes, and replies never justify scaling by themselves.
- Returning an existing current answer counts as a resolved need, not a record improvement. Only a newly published or materially refreshed sourced answer improves the public record.

## Operation

Run `npm run prepare:community-prompts:raleigh`, review one prompt, and publish only after explicit account approval. Space prompts 72 hours apart at the same Raleigh local time. Enter 24-hour and seven-day aggregate results, then run the corresponding evaluator. The strongest result closes the loop with a source-backed answer returned publicly; a respondent share is the clearest propagation signal.

## Reviewer Intake

Paraphrase qualified replies into `data/growth-loops/raleigh-community-question-intake.json`; do not paste reply text or record a name, handle, username, profile URL, or other identity. Run `npm run triage:community-prompts:raleigh`. The output deduplicates repeated place-intent pairs and separates `answer-ready`, `recheck-required`, and `research-needed` work. A social reply establishes demand only. It never serves as the source for the answer.

Run `npm run prepare:community-replies:raleigh` after triage. Reply drafts are generated only for unexpired `answer-ready` records with a source URL, source label, and AuditMap guide URL. Stale and unresolved needs are excluded. A reviewer must recheck time-sensitive guidance and post the answer in the original public thread; the generator never publishes automatically.

Run `npm run sync:community-prompts:raleigh -- 24h` (or `7d`) to copy privacy-safe non-team reply, qualified-need, and resolved-need counts from the triage queue into campaign results. X impressions, engagements, total replies, record improvements, public reply-backs, and respondent shares remain manual fields from their authoritative sources. Partial checkpoints stay uncollected until every required field is entered; unknowns are never converted to zero.
