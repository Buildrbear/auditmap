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

## Launch controls

AuditMap rate-limits costly and trust-sensitive actions in both the Vercel Firewall and the API.
Anonymous contributions always wait for human review, and newly created accounts earn automatic
publication only after account age and approved-contribution thresholds are met. Demo accounts can
never receive moderator privileges.

Production operators can immediately pause community writes, guest notes, reports, media uploads,
profile photos, or Ask AuditMap with the feature switches documented in `.env.example`. Account
suspension is enforced server-side across every contribution and upload route.
