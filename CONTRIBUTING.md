# Contributing to AuditMap

AuditMap is a public-interest map for useful public-place information, local context, and visible
sources. Contributions from people and software agents are welcome through reviewed pull requests.

Software agents must also follow [AGENTS.md](./AGENTS.md). Research and enrichment work uses the
publication checklist in
[docs/agent-data-contribution-standard.md](./docs/agent-data-contribution-standard.md).

## Safe contribution path

1. Pick an approved GitHub issue or OpenTask assignment.
2. Fork `Buildrbear/auditmap`; do not request production credentials.
3. Create a small branch for one task.
4. Make and test the change locally.
5. Open a pull request against `main`.
6. Use the Vercel preview linked to the pull request for visual testing.
7. Address review feedback. An AuditMap maintainer decides whether to merge.

Outside contributors never need the Supabase service-role key, OpenAI key, moderation token, Vercel
token, or access to the production project.

## Local preview

Serve the repository over HTTP instead of opening HTML files directly:

```bash
python3 -m http.server 4173
```

Then visit `http://localhost:4173`. Features requiring server APIs or private environment variables
will use their safe fallback behavior.

Before opening a pull request, check all JavaScript:

```bash
find . -type f -name '*.js' -not -path './node_modules/*' -print0 | xargs -0 -n1 node --check
```

Validate the public place data and its test fixtures:

```bash
node scripts/validate-place-data.mjs
node --test tests/*.test.mjs
```

The validator reports record-specific repair steps and city-level coverage without accessing the
network or changing the data. See [docs/data-validation.md](./docs/data-validation.md) for its
freshness policy, fixed-date option, and repair guide.

GitHub repeats syntax, JSON, place-data, merge-marker, and secret checks automatically.

## Pull request expectations

- Keep one user-facing outcome per pull request.
- Link the GitHub issue and OpenTask assignment when applicable.
- Include screenshots for visual changes.
- Test desktop and phone-sized layouts.
- Describe privacy, security, database, moderation, accessibility, AI-cost, or API-cost implications.
- Never include secrets, real private user information, or precise visitor-location logs.
- Do not bypass moderation or promote community statements to verified facts.
- Do not add analytics, advertising, tracking, or paid placement without explicit maintainer approval.

Draft pull requests are encouraged for early feedback. A preview is not production and may use
different or limited data.

## Public-place information

New or changed factual information should include:

- A stable public source URL.
- The date checked when practical.
- Clear separation between official facts, community reports, and AI-generated summaries.
- Image author, source, and license information for externally sourced media.

Do not scrape or upload copyrighted images without permission. Prefer official public-domain media
or properly licensed Wikimedia Commons files.

## Agentic contributions

AI agents and OpenTask volunteers should work from narrowly scoped issues with observable acceptance
checks. The human submitting the pull request remains responsible for reviewing generated code,
sources, licenses, security implications, and the Vercel preview.

Agents must not:

- Retrieve or expose private credentials.
- make production database changes;
- spend money through paid APIs without approval;
- merge their own pull requests;
- weaken moderation, rate limits, or authorization;
- fabricate sources, test results, or place information.

## Review and merge

`main` is the production branch. Pull requests require passing checks and maintainer review. Changes
to `api/`, `supabase/`, `.github/`, or `vercel.json` receive additional security scrutiny.

Report vulnerabilities privately using the process in `SECURITY.md`.
