# Low-Compute National Operations

This operating model uses deterministic scripts for inventory, comparison, packet creation, and
status reporting. Agent time is reserved for evidence work and judgment that cannot be completed by
a normal program.

## Source of truth

The generated national coverage registry combines:

- AuditMap's production sitemap and official catalog
- the current local sitemap and official catalog
- checked-in research intakes
- explicitly registered OpenTask handoffs with immutable checksums

The local sitemap and catalog must come from the exact campaign review line that new work will build
on. Check out the current pull-request head (including accepted stacked release candidates) before
refreshing. Never assign packets from a snapshot produced on an older side branch: it can reopen work
that the active review line already retired, redirected, or completed. Record the baseline branch and
commit in the pull-request handoff so reviewers can reproduce the queue.

Run:

```bash
npm run refresh:national-coverage
```

The default `asOf` date is calculated explicitly in `America/New_York`, AuditMap's campaign
operating timezone. This prevents a refresh during the Eastern evening from advancing freshness and
claim-expiration checks to the next UTC calendar day. Reproducible historical runs can still pass an
explicit `--as-of YYYY-MM-DD` value.

This writes:

- `data/generated/national-coverage-registry.json` — the complete known destination list
- `data/generated/national-work-packets.json` — exact claimable packets
- `preview/opentask-daily-ask.md` — current sponsor-facing OpenTask update

The refresh uses no language-model calls. It matches unambiguous exact identities, reviewed aliases,
and unique official source URLs within the same state. A unique state-level name is used only when
one side lacks a city; a different city requires official-source corroboration. Shared source pages
and conflicting exact identities remain separate. It does not use fuzzy matching to silently combine
parks. A refresh stops if an unresolved research identity or repeated research slug would create a
second record at an existing canonical path; contributors must resolve the source identity instead of
publishing duplicate registry keys.

## Prevent overlapping work

Every internal or OpenTask assignment must claim one packet from
`data/generated/national-work-packets.json`. Record the reservation in
`data/national-work-packet-claims.json`. The stable version-1 contract is defined by
`data/schemas/national-work-packet-claims.schema.json` and requires:

- packet ID
- assignee
- OpenTask assignment and GitHub issue URLs
- claimed date, expiration date, and last-updated date
- status: `claimed`, `submitted`, `accepted`, `changes-requested`, or `released`

Refresh the registry after updating claims. Claimed packets disappear from the generated OpenTask
ask, so another agent is not invited to repeat the same work. A claim should expire if no evidence or
status update arrives within the assignment's stated window. The refresh rejects duplicate packet
IDs, unknown fields, unknown active packet IDs, malformed URLs or dates, malformed or duplicate
accepted record IDs, accepted record IDs outside an active claim's exact packet, malformed review
queues, and active claims past their expiration date. It never silently transfers a claim. A
`released` claim remains in the audit trail but makes the packet open again; an `accepted` claim
keeps the packet closed.

Optional version-1 fields are `submissionUrl`, `pullRequestUrl`, `acceptedRecordIds`, `reviewQueue`,
and `notes`. Review-queue entries use the schema's structured `issue` and `recommendation` fields,
plus an optional HTTPS `sourceUrl`; plain strings are not valid queue entries. Adding a new required
field or changing status meaning requires a new schema version.

## Daily cycle

1. Check out the authoritative campaign review line, then refresh production and the registry before
   assigning work.
2. Copy the generated ask from `preview/opentask-daily-ask.md` into the OpenTask project.
3. Reserve selected packet IDs in the claims file and linked GitHub issues.
4. Give agents only the records in their packet and the relevant source-format schema.
5. Run structural checks before spending maintainer time on factual review.
6. Accept, request changes, or release the claim; never leave a submission in an unnamed state.
7. Merge reviewed source changes, inspect the Vercel preview, and deploy through the maintainer.
8. Refresh again. Production presence, not research submission, closes the record.

## Use of the Pro account

Use agent sessions for tasks requiring judgment:

- resolving possible duplicates and canonical identities
- reading fragmented operator pages, maps, notices, and PDFs
- checking coordinate provenance and parent-child relationships
- evaluating image identity and reuse rights
- drafting destination-specific visitor guidance from cited facts
- reviewing conflicts and failed validation

Do not spend agent sessions counting pages, diffing sitemaps, generating task lists, rewriting daily
status updates, or rediscovering already assigned places. The registry scripts do those operations
reproducibly at negligible compute cost.

Keep one bounded outcome per task. Prefer finishing a claimed packet over starting another geography.
While the hopper exceeds 100 records, use most available capacity for reconciliation, evidence gaps,
and release packaging rather than broad new discovery.

The generated OpenTask brief applies that threshold deterministically. Above 100 hopper records,
release-reconciliation packets sort before research completion. At or below 100, evidence-completion
packets may lead, while the same WIP caps and finish-before-expanding rule still apply.

Machine-readable lane capacity lives in `data/us-priority-enrichment-queue.json` under
`activeCluster.resumeCheckpoint.campaignCapacity`. The refresh validates the two breadth/one depth
limits against the listed active lanes. When breadth capacity is zero, research-completion packets
move to a visible capacity-blocked backlog rather than the claimable table. Release-reconciliation
maintenance remains available because it does not open a new breadth or depth lane. Every active
capacity entry must match the packet ID, issue URL, pull-request URL, and status in the claim ledger;
refresh fails rather than publishing contradictory coordination state.

## ParkServe reference layer

Trust for Public Land's ParkServe database is the national planning benchmark. Its download page
describes coverage for more than 15,000 U.S. cities and towns and provides park polygons plus selected
trail and playground layers.

ParkServe is not automatically a publication source for AuditMap. Its posted terms restrict copying,
modification, redistribution, and public display of downloaded materials, while some included data may
carry separate upstream licenses. Until a maintainer documents permission and a license-specific
import plan:

- use the aggregate ParkServe count as the national denominator;
- use it privately to identify municipalities or parks needing official-source reconciliation;
- do not publish a copied ParkServe registry, polygons, or attributes;
- verify accepted records through municipal, county, state, federal, or other allowed authoritative
  sources.

The reviewed reference and terms URLs are recorded in `data/national-coverage-sources.json`.

## Vector and ArcGIS sources

Record reusable spatial services once in `data/spatial-source-registry.json` instead of making each
agent rediscover them. The registry stores the publisher, service URL, layer ID, geography, geometry
role, coordinate reference, checked date, approved uses, and license-review state.

Use official agency ArcGIS FeatureServer and MapServer layers for boundaries, entrances, facilities,
trails, beach accesses, and other mapped facts when the publisher and item terms support the use.
ArcGIS is the hosting platform, not the authority or license. A layer hosted on an ArcGIS domain is
not automatically reusable, and an image attachment does not become licensed merely because it is
publicly downloadable.

The spatial workflow is:

1. Register the service and exact layer.
2. Save its publisher and item/service metadata.
3. Review reuse terms separately for geometry, attributes, and attachments.
4. Query the needed geography once and retain source object IDs and checked dates.
5. Match candidates to the coverage registry without silently overwriting reviewed coordinates.
6. Send ambiguous boundaries, entrances, duplicates, and licenses to the review queue.
7. Publish only accepted geometry with source attribution and position quality.

This makes high-quality vector data reusable across many agent packets while preventing repeated
geocoding and repeated ArcGIS discovery work.

## Adding an OpenTask handoff

Do not paste an external submission directly into the database. After review, add its machine-readable
URL, checked date, contribution tier, assignment link, and SHA-256 checksum to
`data/research-intake/opentask-external-sources.json`. The refresh will stop if that external artifact
changes without review. The handoff then participates in deduplication and packet creation every day.

Once accepted source-format records are committed locally, remove or retire the external reference so
the repository becomes the durable source rather than an outside report.
