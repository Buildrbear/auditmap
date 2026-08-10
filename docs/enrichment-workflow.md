# Enrichment Workflow

This workflow keeps AuditMap enrichment fast without lowering publication quality. Generated files are outputs, not research sources; edit the campaign, facts, coordinates, image, or profile records that feed the generator.

## Choose The Right Depth

- **Inventory:** identity, operator, source, address, coordinates, and duplicate status. Do not publish a thin guide as if it were complete.
- **Launch guide:** useful parent answers, current sources, unresolved questions, and one to three licensed photographs when available.
- **Super enrichment:** use for anchor destinations where mapped subsites materially help a visit. Keep the full requirements in `docs/agent-data-contribution-standard.md`.

Do not create subsites to meet a count. A subsite must have an exact reviewed position, a matching reusable photograph, destination-specific guidance, and a current source. Keep a useful amenity as a sourced parent answer when it does not clear that evidence gate.

## Fast Work Loop

1. Work in a connected batch of roughly five to ten parent places.
2. Confirm official sources, image rights, and coordinate evidence before writing detailed subsite answers.
3. Run the campaign enrichment script once after the batch research records are ready.
4. Generate only the affected pages while iterating:

   ```bash
   npm run generate:scope -- --campaign data/example-super-enrichment-campaign.json
   ```

   For an ad hoc set of records, pass stable IDs:

   ```bash
   npm run generate:scope -- --parks place-id-one,place-id-two
   ```

5. Run the matching campaign verifier. Fix evidence or content failures before expanding the batch.
6. Review one parent and one subsite at a 390-pixel viewport before the release build.

Scoped generation intentionally writes only selected parent/subsite pages plus their city and state hubs. It does not rewrite the national hub, sitemap, catalogs, map payload, or unrelated regions.

## Release Gate

Run the expensive complete gate once after the batch is ready:

```bash
npm run release:enrichment:check
```

This performs a complete search-page build, every super-enrichment campaign verifier, national discovery checks, North Carolina image-rights checks, and North Carolina generated-page, performance, and SEO checks. Then use the Git-linked Vercel preview to verify image optimization and responsive rendering.

Never replace the release gate with scoped generation. The scoped command speeds up iteration; the complete command proves the repository still works as a nationwide system.
