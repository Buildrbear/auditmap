# AuditMap Agent Contribution Rules

These rules apply to every software agent, research agent, and OpenTask contributor working in this repository. The goal is not to add the most records. The goal is to make public-place pages genuinely useful, sourced, visual, and safe to publish.

## 1. Work From An Assigned Scope

- Start from a GitHub issue or OpenTask assignment with a named place, metro, dataset, or code outcome.
- Keep one reviewable outcome per submission. Do not expand into unrelated cities or product changes.
- Read `CONTRIBUTING.md`, `docs/agent-data-contribution-standard.md`, and the relevant existing campaign files before editing.
- Preserve changes already in the working tree. Never reset, delete, or overwrite work you did not create.
- Do not deploy production, merge, or modify live database records. A maintainer owns those actions.

## 2. Research And Trust

Use sources in this order:

1. Official operator, municipal, county, state, federal, transit, GIS, or open-data sources
2. Official maps, alerts, reservation systems, event calendars, and accessibility pages
3. OpenStreetMap, Wikidata, and properly licensed Wikimedia Commons media
4. Reviewed community evidence with a date and clear attribution

Search engines, Google Maps, Yelp, Wanderlog, blogs, and social posts may help discover questions or sources. They are not authority by themselves. Do not copy proprietary listings, review text, ratings, photos, or bulk location data.

Every publishable factual answer must have:

- a public source URL
- a source label
- the date checked
- an honest freshness classification or recheck expectation
- no stronger claim than the evidence supports

If sources conflict, record the conflict in the review queue. Do not choose the most convenient answer.

## 3. Keep Evidence Classes Separate

- **Verified fact:** supported by a cited source and eligible for review.
- **Community observation:** attributed, dated, and not presented as official truth.
- **Editorial synthesis:** clearly derived from facts and never used as its own source.
- **Unknown:** left unresolved with a concrete research question.

Never invent hours, fees, access, closures, amenities, coordinates, accessibility, dog rules, or image rights. Never present AI-generated text as evidence.

## 4. Place And Subsite Standard

A parent place must represent a real public destination. Exclude ordinary municipal offices, private apartment amenities, duplicates, and trivial map objects unless the assignment explicitly covers them.

A subsite must be a named or clearly mapped destination that a visitor may need to find, such as an entrance, lot, trailhead, playground, splash pad, restroom, dog area, named trail, field complex, garden, beach, overlook, public artwork, pavilion, or visitor center.

Do not publish ordinary benches, unnamed paths, individual parking aisles, or speculative features.

Every published subsite needs:

- a stable ID and slug
- exact coordinates and coordinate provenance
- a position-quality label
- a useful visitor description
- an official or authoritative source and checked date
- at least one real, licensed or permission-cleared photograph
- destination-specific hours when they differ from the parent
- answers for location, parking, hours, restrooms, fees, accessibility, dogs, family fit, and need-to-know

## 5. Images

- Use real images only. Do not use AI-generated images unless a future task explicitly changes this rule.
- Prefer public-domain government media and clearly licensed Wikimedia Commons files.
- An image appearing on an official website does not automatically grant reuse rights. Record the permission or license basis.
- Store the image source page, creator or owner, license, and descriptive alt text.
- Confirm that the image depicts the named destination. Nearby scenery is not a substitute for a subsite image.
- Never remove attribution or crop out a required credit mark.

## 6. Visitor And Search Value

Parent pages should answer the recurring visitor intents that apply: hours, parking, entrances, restrooms, fees, accessibility, dogs, family use, transit, closures, weather exposure, and major amenities.

Subsite pages must answer questions about that exact subsite, not repeat vague parent copy. Staffed buildings, water features, campgrounds, ticketed attractions, events, and seasonal facilities must not inherit a broad park schedule when they keep separate hours.

Write for a visitor making a decision. Prefer specific guidance such as which entrance, which lot, how far, what closes first, and what to verify before leaving. Do not promise rankings, search volume, or low competition without evidence.

## 7. Data And Code Safety

- Edit source campaign, facts, image, coordinate, profile, or generator files. Do not hand-edit generated park HTML unless the task specifically requires it.
- Preserve stable IDs and canonical URLs. Put alternate or former names in aliases instead of creating duplicates.
- Never add secrets, private user data, precise visitor-location logs, copyrighted review text, or paid API credentials.
- Do not weaken authentication, moderation, rate limits, attribution, freshness, or verification gates.
- Do not add dependencies, spend money, or call paid APIs without explicit approval.

## 8. Required Verification

Run the checks appropriate to the assignment:

```bash
node --check path/to/changed-script.js
npm run generate:scope -- --campaign data/example-super-enrichment-campaign.json
npm run verify:<campaign>:super
```

Use scoped generation while iterating so unrelated national pages are not rewritten. Before delivery, run the complete release gate:

```bash
npm run release:enrichment:check
```

Also verify:

- raw HTML contains the name, address, canonical tag, source-backed answers, and breadcrumbs
- each published image file exists and renders in a Vercel preview
- each subsite navigation link uses its exact coordinates
- pages do not overflow at a 390-pixel phone width
- previously completed campaign verifiers still pass

Do not claim a check passed unless you ran it and saw it pass. A plain local file server cannot validate Vercel's image optimizer; use the pull-request preview for final visual checks.

## 9. Delivery Package

Every contribution must include:

- the OpenTask assignment and GitHub issue links
- a plain-language summary of what changed
- accepted records or files changed
- source list with checked dates
- image rights and attribution list
- commands run and outcomes
- mobile and desktop preview evidence when UI or generated pages changed
- an unresolved review queue for conflicts, missing evidence, or uncertain duplicates
- risks involving privacy, security, moderation, accessibility, cost, or freshness

Research-only work should use the OpenTask handoff template. Code or data changes should arrive as a pull request. Only an AuditMap maintainer can approve publication or production deployment.
