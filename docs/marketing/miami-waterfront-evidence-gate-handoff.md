# Miami Waterfront Evidence-Gate Handoff

## Assignment

- Scope: Maurice A. Ferre Park, Bayfront Park, Matheson Hammock Park, South Pointe Park, Lummus Park, Crandon Park, Bill Baggs Cape Florida State Park, and Historic Virginia Key Beach Park
- Assignment: direct AuditMap owner request continuing the nationwide enrichment campaign
- OpenTask assignment: not separately supplied
- GitHub issue: not separately supplied
- Pull request: https://github.com/Buildrbear/auditmap/pull/25 (draft, stacked on PR #24)
- Checked: 2026-08-11
- Production publication: not performed

## Outcome

All eight parents cleared the release gate with four representative reusable photographs apiece and current operator guidance. Nineteen named destinations cleared exact-position, destination-photo, current-profile, and source-attribution review. Fifty-one legacy routes were retired because they inherited parent imagery or copy, used approximate positions, represented duplicates or adjacent spaces, or lacked a complete destination-specific evidence package. Lummus Park remains a useful parent-only guide.

The retained destination set is: Perez Art Museum Miami, Frost Science, Havana's Balcony, Laser Light Tower, Slide Mantra, FPL Solar Amphitheater, Matheson Atoll Pool, Matheson Marina, South Pointe Pier, South Pointe Promenade, South Pointe Beach, Crandon Beach, Crandon Tennis Center, Cape Florida Lighthouse, Cape Florida Beach, Cape Florida Picnic Pavilions, the Historic Virginia Key dance floor, mini train station, and carousel.

## Sources And Image Rights

Current facts were checked against the City of Miami parks directory and legislation, City of Miami Beach park pages, Miami-Dade County Matheson Hammock and Crandon Park pages, Florida State Parks' Bill Baggs guide, Historic Virginia Key Beach Park visitor pages, Perez Art Museum Miami, Frost Science, Miami-Dade transit guidance, and National Weather Service Miami. The campaign source records retain the exact public URL, label, checked date, evidence class, and freshness expectation for every publishable answer.

The 32 local WebP files were prepared from reviewed Wikimedia Commons and Flickr source pages carrying CC0, CC BY, or CC BY-SA terms. Each record stores the source page, creator, license, license URL, and descriptive alt text. No official-site image was assumed reusable merely because it appeared publicly, and no proprietary listing, review-site, AI-generated, or all-rights-reserved image was accepted.

## Verification

- The evidence-gate rebuild and scoped eight-parent generation completed successfully.
- Both `verify:miami:waterfront` and the backward-compatible `verify:miami:coast` command passed.
- Verification covers eight guides, 32 licensed parent images, 19 exact destinations, retired-route redirects, current source-backed answers, raw HTML, exact-coordinate navigation, and sitemap routes.
- The broad generator revealed unrelated repository-wide generated drift; those accidental files were quarantined and were not included in this batch.
- The Ready draft preview returned HTTP 200 for all 27 retained routes, valid optimized image payloads for all 32 campaign images, and HTTP 308 to the intended parent for all 52 new redirects.
- All retained routes passed 390-pixel checks, all eight parents passed 1440-pixel checks, and no broken preview image, horizontal overflow, or browser warning/error was observed.
- GitHub `validate`, `secrets`, Vercel, and Vercel Preview Comments checks passed.

## Unresolved Review Queue

- Lummus Park's playground, fitness areas, volleyball courts, restroom nodes, access mats, and beachfront path remain parent guidance until each has a current destination-specific reusable photograph and complete exact profile.
- West Matheson restoration is expected through fall 2026 and requires an operator recheck before any affected destination is promoted.
- Bill Baggs capacity closures, fishing-pier status, lighthouse tours, and pavilion closures are operationally volatile and require scheduled rechecks.
- Historic Virginia Key seasonal gate times, holiday closures, carousel operation, and rental access need operator rechecks.
- Museum schedules, admission, sold-out dates, waterfront events, water quality, storm exposure, and construction can change independently of parent park hours.

## Risk And Publication

The material risks are freshness of seasonal hours, fees, capacity closures, construction, event controls, museum admission, and waterfront weather or water conditions. Accessibility claims are limited to what current operator pages support and do not promise a complete step-free route where one was not documented. No secrets, private visitor data, paid APIs, new dependencies, live database writes, production deployment, merge, or promotion were introduced. A maintainer remains responsible for publication.
