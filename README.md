# AuditMap

AuditMap is an open-source site for documenting the audio access experience across public institutions. The goal is to help communities search by city or nearby location, then share ratings, practical notes, and comments about how easy public spaces are to hear, navigate, and use.

## What is in this starter build

- A simple public-facing landing page with a low-color visual style
- A searchable institution directory powered by Supabase when configured
- Guest search by city, institution, or nearby location
- GitHub sign-in for authenticated posting
- A contribution form that drafts previews in demo mode, publishes in live mode, and lets signed-in contributors update their own live posts
- A no-build front end that can deploy directly on Vercel
- A documented open-source workflow in `CONTRIBUTING.md`

## Cheap production stack

This repo is designed for:

1. Vercel for static hosting
2. Supabase for database and auth
3. GitHub OAuth for contributor login
4. Public read access, authenticated write access

If `config.js` is left blank, the site falls back to demo mode with the local sample data in `data/institutions.json`.

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

## Vercel deploy

1. Import this repo into Vercel.
2. Deploy it as a static site with no build command.
3. Make sure the deployed URL is also added to the Supabase redirect allow list.
4. Update `config.js` before deployment so the client can connect to Supabase.

## Institution record shape

Each institution uses this structure:

```json
{
  "id": "atl-library-central",
  "name": "Atlanta Central Library",
  "type": "Library",
  "city": "Atlanta",
  "state": "GA",
  "address": "1 Margaret Mitchell Sq NW",
  "latitude": 33.7553,
  "longitude": -84.3900,
  "rating": 4.4,
  "summary": "Short note about the listening environment.",
  "tags": ["quiet zone", "staff support", "echo risk"],
  "comments": [
    {
      "author": "Community member",
      "text": "First-hand experience or recommendation."
    }
  ]
}
```

## Local preview

Because the site loads JavaScript modules and optional Supabase config, preview it through a simple local web server instead of opening `index.html` directly from the filesystem.

Examples:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Good next steps

- Move `config.js` to a deployment-specific workflow if you do not want to edit it by hand
- Add moderator tooling for reports, takedowns, and review queues
- Add abuse reporting and basic rate limiting
- Add a map layer after the searchable directory is stable
