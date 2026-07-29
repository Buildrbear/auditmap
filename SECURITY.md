# Security policy

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting for
[Buildrbear/auditmap](https://github.com/Buildrbear/auditmap/security/advisories/new).
Do not post credentials, exploit details, private user information, or an unpatched vulnerability
in a public issue or OpenTask discussion.

Include the affected page or endpoint, reproduction steps, impact, and a suggested fix when known.
AuditMap will acknowledge a report as soon as practical and coordinate disclosure after a fix is
available.

## Contribution safety

- Never commit API keys, service-role keys, admin tokens, passwords, or private location data.
- Browser code must not receive server-only environment variables.
- Public contributions stay untrusted until moderation completes.
- Pull requests that change `api/`, `supabase/`, authentication, moderation, or AI spending require
  an AuditMap maintainer's review.
- Test unfamiliar contributions only through their isolated Vercel preview.
