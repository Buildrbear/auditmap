# Explorer Rollout Readiness

## Assignment

This work implements the user-assigned AuditMap goal to make the shared Explorer experience the standard for every park with eligible mapped subsites. No separate OpenTask assignment or GitHub issue was provided for this working session.

Production deployment and live database changes remain maintainer-owned and are not part of this rollout package.

Protected Vercel preview: `https://auditmap-compatably-derrys-projects-f5a18cb6.vercel.app/?city=san-francisco-ca&explore=launch-ca-san-francisco-golden-gate-park&release=61`

Deployment review: `https://vercel.com/derrys-projects-f5a18cb6/auditmap/AEqkByQLPmkguqmXFYLPh3hGCSMo`

## Product Model

- The main map discovers and compares parent public places.
- A park page's site map provides local context and quick movement between mapped destinations.
- Explorer browses trusted destinations inside one park without starting guidance.
- Guide me is an explicit, optional on-foot orientation mode after a destination is selected.
- Google Maps handles arrival by car, transit, or from outside the park vicinity.

## Explorer Publication Gate

A park receives Explorer only when at least two subsites each have:

- a stable ID and visitor-facing name;
- valid, non-zero latitude and longitude;
- coordinate provenance or a position-quality label;
- a public source URL and checked date; and
- a real image with retained rights metadata in the source record.

Incomplete features can remain available to lower-level review and site-map workflows, but they do not silently receive the richer Explorer and Guide me treatment.

## Coverage

The generated catalogue currently contains 330 Explorer-ready park records across 29 states and districts. The rollout verifier checks every eligible record, every local image path, every generated canonical park page, every embedded subsite payload, and every current Explorer asset reference.

Representative browser checks covered:

- Dix Park: 48 mapped destinations and nearby on-foot guidance;
- Central Park: 27 mapped destinations and image-rich selection;
- Golden Gate Park: generated site page to Explorer handoff on desktop;
- Balboa Park: nine-destination desktop layout;
- Boston Common: away-from-site Google arrival handoff;
- Branch Brook Park: two-destination minimum at a 390-pixel phone width; and
- Prospect Park: generated-page and catalogue regression coverage.

## Verification

The following checks passed on August 8, 2026:

```text
node --check app.js
node --check scripts/generate-search-pages.js
node --check scripts/verify-explorer-rollout.js
node --check scripts/test-map-deck-ui.js
npm run generate
npm run verify:explorer-rollout
npm run test:map-deck
npm run test:crumbs
npm run test:safety
npm run verify:dix:flagship
npm run verify:triangle:flagships
npm run verify:central-park:flagship
git diff --check
```

Mobile and desktop browser verification found no horizontal page overflow. Destination selection, images, deep links, site-page handoff, nearby guidance, away-from-site arrival choices, and the two-subsite minimum all behaved as expected.

## Trust, Privacy, And Accessibility

- Explorer does not add precise visitor-location logging or persist location history.
- Browser geolocation remains permission-based and is used for proximity, heading, and map orientation.
- Guidance intentionally points toward a destination without claiming a verified walking route; visitors are told to choose a safe public path.
- Google navigation is an explicit external handoff, not a silent redirect.
- Map markers and destination cards remain keyboard-addressable, guidance status uses a live status region, and mobile controls retain visible text labels.
- Incomplete source, image, date, or coordinate-provenance records fail closed instead of being presented as fully trusted destinations.

## Review Queue

| Area | Remaining field check | Recommended action |
| --- | --- | --- |
| Physical GPS | Heading accuracy varies by phone, browser, compass calibration, and movement speed. | Test nearby guidance while walking at one compact park and one large park before production promotion. |
| Vercel images | A plain local server cannot validate the Vercel image optimizer. | Repeat the representative image checks on the protected Vercel preview. |
| Coverage growth | Parks outside the current 330-record set may have no subsites or incomplete subsite evidence. | Let the publication gate keep Explorer hidden until at least two subsites pass review. |
| Production | The implementation is prepared for review but has not been promoted. | Maintainer reviews the diff and preview, then decides whether to merge and deploy. |

## Source And Image Basis

The rollout does not introduce new place facts or media. It uses the existing reviewed subsite records and preserves each record's public source URL, checked date, coordinate provenance, image source, creator, license, and alt text. The rollout verifier rejects missing local image files and unsafe non-HTTPS external image URLs.
