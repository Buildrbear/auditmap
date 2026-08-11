# Wilmington Evidence-Gate Handoff

## Assignment

- Scope: Brandywine Park and Rockford Park as one connected Wilmington, Delaware batch
- Assignment: active AuditMap nationwide enrichment continuation
- OpenTask assignment: not separately supplied
- GitHub issue: not separately supplied
- Pull request: pending stacked draft
- Preview: pending pull-request deployment
- Checked: 2026-08-11
- Production publication: not performed

## Outcome

Brandywine Park and Rockford Park now meet the four-photo parent gate with current official visitor guidance, explicit hours and transit guidance, and parent records persisted across both subsite datasets, the launch map, and both parent-information sources. The Wilmington generator enforces the eleven recurring parent intents instead of depending on whichever legacy source layer happens to contain more answers.

Two destinations clear the exact-photo, exact-position, and destination-profile gate: Josephine Fountain and Rockford Tower. Josephine Fountain uses an exact geotagged destination photograph; Rockford Tower uses the exact named OpenStreetMap building. Each has one destination-specific reusable photograph, nine source-backed visitor answers, exact-coordinate navigation, and honest accessibility and schedule caveats.

The inherited Brandywine Zoo standalone route was retired with a permanent redirect to Brandywine Park. Its available animal portrait carries ambiguous permission wording despite a Commons public-domain label, while the available entrance postcard is historic and would not represent the current visitor arrival. Current zoo hours, seasonal fees, parking, accessible restrooms, slope limitations, service-animal rules, and family planning remain on the Brandywine Park parent guide where the official zoo sources support them.

## Official And Authoritative Sources

- City of Wilmington, Brandywine Park: `https://www.wilmingtonde.gov/Home/Components/FacilityDirectory/FacilityDirectory/131/118`
- City of Wilmington, Rockford Park: `https://www.wilmingtonde.gov/Home/Components/FacilityDirectory/FacilityDirectory/223/118`
- Wilmington State Parks agency listing and current 8:00 a.m.-sunset access: `https://getconnected.delaware.gov/agency/detail/?agency_id=176980`
- City of Wilmington dog parks: `https://www.wilmingtonde.gov/government/city-departments/department-of-parks-and-recreation/wilmington-s-dog-parks`
- Brandywine Zoo admission, hours, parking, and closures: `https://brandywinezoo.org/visit/`
- Brandywine Zoo accessibility, restrooms, parking, and service animals: `https://brandywinezoo.org/visit/accessibility/`
- DART First State map and routes: `https://www.dartfirststate.com/map/` and `https://www.dartfirststate.com/routes/`
- Greater Wilmington Convention & Visitors Bureau current Rockford Tower Afternoons listing: `https://www.visitwilmingtonde.com/listing/rockford-park/940/`
- Rockford Tower exact named building: `https://www.openstreetmap.org/way/302761632`
- Josephine Fountain exact geotag: `https://commons.wikimedia.org/wiki/File:Brandywine_Park_Blossoms.JPG`

## Image Rights And Attribution

Eight local WebP assets were prepared from reviewed Wikimedia Commons source pages. Brandywine Park uses two public-domain photographs by Luiz F. Castro and Smallbones plus two CC BY-SA 4.0 photographs by Ethelred unraed. They show the creek and skyline, the Swinging Footbridge and historic bridges, Josephine Fountain, and the wooded riverbank.

Rockford Park uses a public-domain photograph by Smallbones plus three CC BY-SA 4.0 photographs by JoPod and Ethelred unraed. They show the Samuel Francis Du Pont statue with Rockford Tower, the tower from the field, the broad lawn from the tower, and the Bancroft Memorial terraces.

Exact source pages, creators, licenses, license URLs, alt text, and rejection decisions are recorded in `data/wilmington-evidence-gate-photo-selections.json` and `data/generated/wilmington-evidence-gate-images.json`. No official-site photograph was treated as reusable without a license. Nearby Brandywine Creek State Park images, a historic zoo entrance postcard, the ambiguous zoo animal portrait, and repetitive tower studies were rejected.

## Verification

- JavaScript syntax checks passed for the image preparer, enrichment generator, and verifier.
- Live Commons rights metadata checks and image preparation produced four Brandywine Park and four Rockford Park assets at 1600 by 1000 pixels.
- Scoped generation completed successfully.
- `npm run verify:wilmington:super` passed two parents, two exact destinations, eight local images, one permanent retirement redirect, raw HTML, exact navigation, source-backed answers, and four persisted source layers.
- The complete `npm run release:enrichment:check` gate passed all 53 enrichment campaigns with zero failures, national discovery, 272 North Carolina image-rights records, 655 North Carolina generated-page checks, galleries, dog-park media rules, performance, and SEO.
- Full-generation-only national churn was reversed after the successful release gate; only the reviewed Wilmington source and generated paths remain changed.
- All four retained routes passed 390-by-844-pixel browser checks with the correct heading and canonical tag, no application error, and no horizontal overflow. Both parent routes passed the same checks at 1440 by 1000 pixels. The only local image failures were expected `/_vercel/image` requests from the plain file server; optimized-image verification remains pending the pull-request preview.

## Unresolved Review Queue

| Place | Field or feature | Conflict or missing evidence | Sources checked | Recommended next action |
| --- | --- | --- | --- | --- |
| Brandywine Park | Brandywine Zoo | The exact animal portrait has ambiguous reuse wording; the entrance postcard is historic | Brandywine Zoo, Wikimedia Commons | Keep on the parent guide until a current representative reusable zoo or entrance photograph clears rights review |
| Brandywine Park | Jasper Crane Rose Garden, Swinging Footbridge, Sugar Bowl, playgrounds, dog areas, stadium | No candidate cleared current exact profile, exact position, and destination-specific photo review together | City of Wilmington, Wilmington State Parks, Wikimedia Commons, OpenStreetMap | Retain parent guidance and release individually only when the complete evidence set clears |
| Josephine Fountain | Seasonal operation | The exact photograph and named state source clear identity, but no current operator page promises water flow or bloom | Wilmington State Parks, Wikimedia Commons | Avoid promising operation or bloom; recheck maintenance and event notices |
| Rockford Tower | Observation-deck access | The 2026 schedule is fast-changing and the operator does not publish a detailed step-free access statement | City of Wilmington, current destination bureau listing, OpenStreetMap | Recheck same-day schedule and weather; do not describe the deck as step-free without operator confirmation |
| Rockford Park | Other destinations | Memorials, dog area, courts, fields, sledding areas, and trails lack complete exact current profiles paired with matching photographs | City of Wilmington, Wikimedia Commons, OpenStreetMap | Keep in parent guidance until each clears the full destination gate |

## Risk And Publication

This batch changes source campaign data and generated static pages but does not alter production data, authentication, moderation, rate limits, analytics, dependencies, or API costs. Primary risks are the fast-changing tower schedule, weather closures, seasonal fountain operation, large-event parking changes, and incomplete destination photography. No secrets, private visitor data, paid APIs, live database writes, merge, production deployment, or production promotion were performed.
