# Place-data validation

AuditMap validates `data/institutions.json` locally and in pull requests. The check is deterministic,
uses only Node.js, does not contact source websites, and never rewrites the data.

## Run the check

```bash
node scripts/validate-place-data.mjs
```

Use a fixed date when reproducing a result or testing fixtures:

```bash
node scripts/validate-place-data.mjs --as-of 2026-07-29
```

The default freshness limit is 365 days. Maintainers can test another policy without changing data:

```bash
node scripts/validate-place-data.mjs --max-age-days 180
```

Run the automated fixture tests with:

```bash
node --test tests/*.test.mjs
```

The command exits with status 1 when it finds an error. Likely duplicates are warnings that require
human review but do not fail the check. The city report always shows coverage for a primary source,
a current source-check date, valid coordinates, and a fully attributed primary image.

## Repair guide

- **Required field:** add the missing identity, location, or citation value from a public source.
- **Coordinates:** use finite decimal latitude and longitude values in global GIS ranges. Review
  their placement; passing the range check does not make coordinates survey-grade.
- **Source:** use a stable public HTTP or HTTPS page, not a placeholder, local address, search result,
  or private dashboard. The validator deliberately does not make a live request.
- **Date:** use the real date the source was reviewed in `YYYY-MM-DD` form. Never advance the date
  without rechecking the source.
- **Duplicate:** merge records that describe the same place. If similarly named places are distinct,
  retain clear names, addresses, and stable IDs so a reviewer can tell them apart.
- **Image:** provide `url`, `source`, `author`, `license`, and useful `alt` text together. Remove an
  image entry if its attribution or reuse permission cannot be established.
- **Contact:** copy only public phone, email, or website details from an official source. Remove
  unverifiable contact details rather than guessing.
- **Contradiction:** resolve mutually exclusive access, accessibility, or cost statements against a
  current source. The validator reports conflicts but never chooses or rewrites a claim.

Validation is a baseline safety check, not verification. A passing record still needs reviewer
judgment about source quality, licensing, community claims, and the precision of map coordinates.
