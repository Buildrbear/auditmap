# AuditMap

AuditMap is an open, map-first public place browser. Raleigh, North Carolina is the first
curated city, and statewide discovery supports communities across North Carolina.

## Contributing and previews

AuditMap uses a review-first open-source workflow:

1. Contributors fork this repository and open a pull request.
2. GitHub runs syntax, JSON, merge-marker, and secret checks.
3. Vercel creates an isolated preview for the pull request.
4. Reviewers test the preview without giving contributors production credentials.
5. Only an approved merge to `main` updates production.

See [CONTRIBUTING.md](./CONTRIBUTING.md), [SECURITY.md](./SECURITY.md), and the development-task
issue template. OpenTask assignments should link to a GitHub issue so scope, acceptance checks,
review, preview, and merge history remain visible in one place.

The production branch must be protected in GitHub. Require a pull request, the `validate` and
`secrets` checks, conversation resolution, and approval from the code owner before merge. Do not
share Supabase, OpenAI, moderation, GitHub owner, or Vercel production credentials with volunteers.

## Vercel environments

- **Production:** the `main` branch at `www.auditmap.org`.
- **Preview:** every pull request and non-production branch receives a unique Vercel URL.
- **Local:** contributors run a simple local server with safe data fallbacks.

Production secrets stay in Vercel's Production environment. Preview should use separate,
least-privileged keys or no private keys at all. Never expose the Supabase service-role key,
admin tokens, or OpenAI key to browser code or untrusted preview deployments.

## What is in the current build

- A minimal split-view browser with image-led listings and a clickable Leaflet map
- A seeded Raleigh launch dataset covering parks, libraries, transit, museums, civic resources, and city offices
- Dedicated dog-park discovery using OpenStreetMap's `leisure=dog_park` classification
- Statewide North Carolina city/address search backed by OpenStreetMap and Nominatim
- Nearby discovery that loads public places around a coarse browser location
- City-aware filtering generated from the underlying place data
- Cross-city text search and browser-based nearby discovery with distance ranking
- Dedicated place pages with cited living briefs, useful details, comments, and photos
- Sourced Wikimedia Commons seed media with visible author and license attribution
- Local draft flows for new places, comments, photos, edit suggestions, and reports
- A moderation-ready Supabase schema for shared publishing
- PostGIS radius search for fast map and nearby queries
- An append-only shared contribution feed with queued claim analysis
- Field-level facts, claims, and supporting or contradicting evidence
- A static front end that can deploy directly on Vercel

## Raleigh launch notes

- The seeded places were curated from public place pages on or around **July 23, 2026**.
- Source links in the UI point back to the official page used for each listing whenever possible.
- Coordinates in `data/institutions.json` are curated for map placement in the prototype and should be treated as seed data, not survey-grade GIS records.

## Cheap production stack

This repo is still designed for:

1. Vercel for static hosting
2. Supabase for database and auth
3. GitHub OAuth for contributor login
4. Public read access, authenticated write access

If the database environment variables are absent, the site continues using local seed data and
browser-local contributions. This fallback is intentional so public browsing does not fail during
database maintenance.

## Supabase setup

1. Create a Supabase project.
2. Open the SQL editor and run [supabase/schema.sql](/Users/michaelhobgood/Developer/auditmap/supabase/schema.sql).
3. In Supabase Authentication, enable the GitHub provider.
4. In GitHub OAuth app settings, use Supabase’s callback URL:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
5. In Supabase Authentication URL settings, add your local and production site URLs to the redirect allow list.
6. Fill in [config.js](/Users/michaelhobgood/Developer/auditmap/config.js) with:

```js
window.AUDITMAP_CONFIG = {
  supabaseUrl: "https://your-project-ref.supabase.co",
  supabasePublishableKey: "your-publishable-key",
  authProvider: "github",
};
```

7. Add these server-side environment variables in Vercel:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
CONTRIBUTION_HASH_SALT
```

The service-role key is used only inside Vercel Functions and must never be added to `config.js` or
sent to the browser.

## Data shape

Each local seed entry can include:

```json
{
  "id": "dix-park",
  "name": "Dix Park",
  "type": "Park",
  "city": "Raleigh",
  "state": "NC",
  "country": "US",
  "citySlug": "raleigh-nc",
  "address": "1030 Richardson Drive",
  "latitude": 35.7704,
  "longitude": -78.6569,
  "rating": 4.9,
  "neighborhood": "Downtown South",
  "status": "Destination park",
  "hours": "Open daily from dawn to dusk.",
  "sourceLabel": "City of Raleigh",
  "source": "https://raleighnc.gov/parks-and-recreation/places/dix-park",
  "verifiedAt": "2026-07-27",
  "accessibility": "Accessible features need community verification",
  "cost": "General park access is free",
  "transit": "Transit and arrival details need documentation",
  "amenities": ["Event lawns", "Play areas", "Trails"],
  "image": {
    "url": "https://commons.wikimedia.org/wiki/Special:FilePath/Raleigh%20Dix%20Park.jpg?width=1400",
    "source": "https://commons.wikimedia.org/wiki/File:Raleigh_Dix_Park.jpg",
    "author": "Maria Kozmina",
    "license": "CC BY-SA 4.0",
    "alt": "Open lawn and skyline view at Dix Park"
  },
  "summary": "Short note about why the place matters on the map.",
  "tags": ["park", "events"],
  "comments": [
    {
      "author": "AuditMap seed",
      "text": "Helpful context note."
    }
  ]
}
```

The Supabase blueprint separates cities, places, sources, field-level facts, contributions,
AI-extracted claims, claim evidence, media, reports, and generated briefs. Public contributions are
moderation-first rather than automatically published.

## Knowledge pipeline

AuditMap keeps observations separate from accepted facts:

1. A visitor submits a review, correction, confirmation, or observation.
2. The original contribution is stored unchanged with `analysis_status = queued`.
3. A future analysis worker extracts small claims such as `fee = free` or
   `dogs = leash_required`.
4. Claims are compared with official sources, accepted facts, and other observations.
5. Evidence records whether a source supports, contradicts, or merely contextualizes a claim.
6. Only reviewed claims can become accepted `place_facts`.
7. Generated briefs cite the facts and claims they summarize; they never become the source of truth.

The current API deliberately implements steps 1 and 2. Claim extraction is not faked in the
browser and should be enabled only when a versioned model prompt, moderation policy, and worker are
configured.

## Place enrichment worker

`POST /api/enrich-place` creates a source-grounded draft for one place. It searches the public web,
prioritizes official sources, records unresolved questions and conflicts, and calculates an internal
completeness score. Generated facts remain proposed, generated briefs remain drafts, and the place
remains pending until a person or documented trust policy reviews it.

The endpoint is deliberately private because each run can incur search and model costs. Configure:

```text
OPENAI_API_KEY
OPENAI_ENRICHMENT_MODEL=gpt-4.1-mini
ENRICHMENT_ADMIN_TOKEN
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Call it from a trusted admin process:

```bash
curl -X POST https://www.auditmap.org/api/enrich-place \
  -H "Authorization: Bearer $ENRICHMENT_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"place":{"id":"dix-park","name":"Dix Park","type":"Park","city":"Raleigh","state":"NC","address":"1030 Richardson Drive"}}'
```

Without Supabase, the worker can return a draft but cannot save it. Without
`ENRICHMENT_ADMIN_TOKEN`, it stays disabled rather than exposing a paid public endpoint.

## Community-audited place model

Each place is organized as a living public record:

1. **Verified information** shows sourced facts with freshness and provenance.
2. **Help verify** turns missing, aging, or conflicting fields into quick community questions.
3. **Community board** keeps questions, visit updates, reviews, corrections, photos, and replies
   attached to the durable place record.
4. **Sources and record history** stays compact by default and expands to show citations and dates.

AuditMap can use AI to extract claims, identify conflicts, generate verification questions, and
draft cited summaries. AI does not independently verify facts or erase the underlying conversation.

Active places can have multiple **Place Stewards**. Institution stewards are verified employees or
public officials; community stewards are knowledgeable volunteers. Stewards may propose facts,
organize duplicate discussions, answer with a visible role, and flag abuse or outdated information.
They cannot remove criticism, hide conflicting evidence, declare unsupported claims verified, or
access private visitor location data. Platform moderation and appeals remain independent.

## Shared APIs

- `GET /api/places` returns published shared records.
- `GET /api/places?lat=...&lon=...&radius=...` uses PostGIS to rank nearby records.
- `GET /api/feed?placeId=...` returns published contributions for a place.
- `POST /api/feed` stores a contribution for moderation and claim analysis.
- `GET /api/moderation` returns pending contributions to an authorized reviewer.
- `POST /api/moderation` publishes or rejects one pending contribution.

The private review inbox is available at `/admin.html`. It accepts `MODERATION_ADMIN_TOKEN`,
falling back to `ENRICHMENT_ADMIN_TOKEN` while the dedicated moderation key is not configured.
The key is kept only for the current browser tab and is never included in a public page or URL.

New contributions receive a structured AI moderation pass using `OPENAI_MODERATION_MODEL` (default
`gpt-4.1-mini`). Only high-confidence, low-risk contributions publish automatically. Clear abuse
can be rejected automatically; consequential claims and uncertainty remain pending. Every AI
decision is stored with its model, prompt version, confidence, flags, and explanation. The review
inbox can override any published, pending, or rejected decision and retains a bounded decision
history.

Ask AuditMap loads only published community discussion for the selected place and labels
discussion-derived details as community reports rather than verified facts. Each place-specific
question also increments a deduplicated `information_needs` record. The private review inbox ranks
these gaps by ask count so repeated visitor questions directly guide verification work.

Published community-board questions receive a threaded reply from **AuditMap Assistant** when AI is
configured. Replies use only the place record, cited sources, and published discussion; they are
visibly labeled as AI-generated and classified as sourced, partial, or needing verification. The
question still enters the information-gap queue, and the AI reply never promotes community text into
a verified fact.

The map tries the shared geographic database first and falls back to the current public-data
discovery path when the database is unavailable or has no nearby records.

## Search expansion plan

The current browser search is intentionally useful without a backend: it searches every loaded
place, supports city and neighborhood terms, and ranks results with a Haversine distance when a
visitor shares their location. The interface renders at most 50 results to keep map performance
predictable as seed data grows.

For broader expansion:

1. Add cities and places through the same city-aware record shape; filters are generated from data.
2. Move text filtering to Supabase full-text search once the public dataset is too large to download.
3. Add PostGIS and a server-side radius query for production-scale nearby search.
4. Return results in map bounds, cluster dense markers, and progressively load additional cards.
5. Store only coarse or short-lived visitor coordinates unless someone explicitly chooses otherwise.

## North Carolina discovery model

AuditMap uses two visibly different record levels:

1. **Curated records** include checked public sources, sourced photography, visitor synopsis text,
   useful details, and a recorded verification date.
2. **Community records** are created on demand for a North Carolina city, address, or nearby
   location using available public map information. The public interface presents useful base
   details without exposing ingestion terminology; exact provider attribution remains available in
   the expandable source history. Contributors can add firsthand context, photography, and official
   sources.

The server endpoints under `api/` keep third-party requests out of the browser, restrict geocoding
to North Carolina, cap result counts and search radii, and cache public responses. Browser location
coordinates are rounded to roughly neighborhood-level precision before statewide place discovery;
the precise coordinate remains in the browser only for distance ranking and the local map marker.

OpenStreetMap-derived records retain a direct link to their source and are cached in the visitor's
browser when selected so the dedicated place page and contribution tools work without a database.
The production database should eventually ingest these records into a moderation queue rather than
relying on browser storage.

## Local preview

Because the site loads JavaScript modules, remote Leaflet assets, and optional Supabase config, preview it through a simple local web server instead of opening `index.html` directly from the filesystem.

Example:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Living brief principles

- The brief is never the source of truth; cited records and community additions are.
- AI-generated briefs should store model and prompt versions plus the source IDs used.
- New briefs should remain drafts until reviewed or pass a documented trust policy.
- Ads, paid placement, and commercial ranking signals should not influence public-place summaries.
