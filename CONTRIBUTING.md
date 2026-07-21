# Contributing to AuditMap

Thanks for helping build a public resource for audio access across public institutions.

## Fastest way to contribute

1. Open the site locally and fill out the contribution form
2. If live mode is configured, sign in with GitHub and publish directly
3. If you already published a live post, use the directory card action to load it back into the form and update it
4. If the site is still in demo mode, copy the generated JSON preview
5. Add a new entry to `data/institutions.json` or wire the missing Supabase config
6. Open a pull request with a short note about what changed

## Submission checklist

- Confirm the institution is a public-facing place or service
- Include institution name, type, city, state, and street address
- Use a `rating` from `1.0` to `5.0`
- Keep `summary` focused on practical audio access conditions
- Add tags that help others scan the record quickly
- Keep comments factual, useful, and safe for public display

## Style guide for entries

- Prefer concise summaries over long narratives
- Use state abbreviations like `GA`, `IL`, and `OR`
- Reuse existing institution types when possible
- Reuse existing tags when possible so filters stay useful

## Example entry

```json
{
  "id": "downtown-public-library-atlanta-ga",
  "name": "Downtown Public Library",
  "type": "Library",
  "city": "Atlanta",
  "state": "GA",
  "address": "123 Civic Center Plaza",
  "rating": 4.2,
  "summary": "Front desk staff communicate clearly and the reading room stays quiet, but the lobby gets noisy during school pickup hours.",
  "tags": ["quiet zone", "loud lobby", "staff support"],
  "comments": [
    {
      "author": "Community member",
      "text": "The side entrance had the shortest line and made conversations easier to follow."
    }
  ]
}
```
