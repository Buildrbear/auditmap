# Agent Data Contribution Standard

This is the publication checklist for AuditMap research and enrichment tasks. It complements `AGENTS.md` and `CONTRIBUTING.md`.

## Contribution Tiers

### Inventory

Use this tier to identify candidate public places without publishing a full guide.

Required fields:

- canonical name and known alternate names
- city, state, country, and category
- managing agency
- official source URL and checked date
- address and coordinates with provenance
- reason the place belongs in the assigned coverage tier
- duplicate or uncertainty status

### Launch Guide

Use this tier when a place should become a useful public page but deep subsite research is not assigned.

Required fields:

- all inventory fields
- concise visitor summary
- hours, parking, arrival, restrooms, fees, accessibility, dogs, family fit, transit, and need-to-know answers where applicable
- one to three real, licensed photographs when available
- source and freshness metadata for every answer
- unresolved questions queue

### Super Enrichment

Use this tier for anchor destinations and large parks.

Required fields:

- all launch-guide fields
- at least four varied parent photographs
- generally 3-12 verified subsites, with eight as the standard metro-campaign target
- at least one real photograph per published subsite
- eleven parent visitor answers
- nine destination-specific subsite answers
- exact subsite coordinates, provenance, and position quality
- independent hours for staffed, seasonal, ticketed, weather-dependent, or event-controlled subsites
- raw static parent and subsite pages with canonical metadata
- one responsible search-opportunity brief per parent place

The task assignment controls the tier. Do not inflate a small assignment into super enrichment without approval.

## Parent Answer Set

Use the intents that apply to the place:

| Intent | Required question |
| --- | --- |
| `hours` | When is the place open, and what uses separate hours? |
| `parking` | Where should a visitor park? |
| `entrance` | Which entrance or arrival point should they use? |
| `restroom` | Where and when are restrooms available? |
| `fees` | What is free and what costs extra? |
| `accessibility` | What accessible routes, facilities, and limitations are documented? |
| `dogs` | Are dogs allowed, and where do rules differ? |
| `family` | What should adults know when visiting with children? |
| `transit` | Can the place be reached without a car? |
| `need-to-know` | What is most likely to prevent a successful visit? |
| `weather` | Which weather, water, heat, air-quality, or seasonal conditions matter? |

## Subsite Answer Set

Every published subsite should include:

1. Exact location
2. Parking or nearest practical arrival point
3. Its own hours or an explicit statement that parent hours apply
4. Nearest reliable restrooms
5. Fees or reservation requirements
6. Accessibility and known limitations
7. Dog rules
8. Family fit and safety context
9. Need-to-know guidance specific to that destination

## Freshness Defaults

- Recheck closures, availability, construction, parking, lifeguards, water features, and event access quickly.
- Recheck ordinary staffed hours, fees, reservations, and seasonal rules regularly.
- Recheck stable physical facts, named landmarks, and trail locations less frequently.
- An expired answer should not remain labeled as currently verified.

When a precise recheck interval is not available, identify the answer as fast-changing, seasonal, or stable and explain what a future reviewer should verify.

## Accessibility Language

- Report documented features and route conditions, not a vague conclusion that an entire place is "accessible."
- Distinguish an accessible building or main route from natural surfaces, sand, slopes, ladders, water access, and older facilities.
- Do not infer disability suitability from photographs or map geometry alone.
- Preserve uncertainty and recommend contacting the operator when a specific accommodation is undocumented.

## Coordinate Standard

- Parent coordinates should represent the practical public arrival point, not an arbitrary polygon center, when possible.
- Subsite coordinates should represent the named feature or its visitor entrance.
- Record the coordinate source and a position-quality label.
- Check that a subsite is plausibly within or adjacent to the parent destination.
- Do not silently replace reviewed coordinates with bulk geocoder results.

## Image Record

Each image record must include:

```json
{
  "url": "/assets/parks/example.webp",
  "source": "https://source-page.example/image",
  "author": "Creator or owner",
  "license": "Public domain, CC BY 4.0, or documented permission",
  "alt": "What the image visibly shows at the named place"
}
```

Do not use `source` as a substitute for `license`. If reuse rights are unclear, put the candidate in the review queue instead of publishing it.

## Rejection Conditions

A reviewer should reject or return a contribution when it contains:

- fabricated or uncited factual claims
- copied Google, Yelp, or other proprietary review/database content
- unlicensed or mismatched media
- duplicate places presented as separate destinations
- parent-level copy substituted for subsite-specific guidance
- uncertain coordinates presented as exact
- accessibility claims based only on inference
- missing checked dates or source URLs
- secrets, personal data, or production changes
- claimed tests that were not run

## Review Queue Format

Use one row per unresolved item:

| Place | Field or feature | Conflict or missing evidence | Sources checked | Recommended next action |
| --- | --- | --- | --- | --- |

Unknowns are useful work. Recording them clearly is better than publishing a guess.
