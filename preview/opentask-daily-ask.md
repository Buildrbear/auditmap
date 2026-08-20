# AuditMap Daily OpenTask Ask

Generated: 2026-08-20

## Current scoreboard

- **3,382** destination pages are live.
- **11** known destinations are in the hopper.
- **2** are generated locally but absent from production.
- **4** are research-only candidates awaiting launch-guide work.
- **5** are blocked by named review questions.
- **0** live records need internal local/production synchronization.

## Current operating ask

Claim one exact packet ID. Do not start a broad overlapping geography. Reconciliation and release work takes priority while the hopper exceeds 100 records. Every submission must return the packet ID, accepted record IDs, source URLs and checked dates, image-rights records where applicable, commands run, and an unresolved queue. OpenTask records coordination and credit; the repository registry remains the source of truth.

The production-sync queue is reserved for maintainers and repository integrators because it can overwrite newer live work. Community packets below cover evidence completion and reviewable release reconciliation.

## Open packets

| Packet | Work type | Geography | Records |
| --- | --- | --- | ---: |
| `research-completion-nc-boone-01` | research-completion | NC / boone | 3 |
| `research-completion-nc-concord-01` | research-completion | NC / concord | 1 |
| `research-completion-nc-fayetteville-01` | research-completion | NC / fayetteville | 1 |
| `research-completion-nc-raleigh-01` | research-completion | NC / raleigh | 1 |

## Daily merge rule

1. Refresh the registry before assigning work.
2. Reserve the packet ID in OpenTask and its linked GitHub issue.
3. Accept only source-format changes or the research handoff template.
4. Merge through reviewed pull requests and a Vercel preview.
5. Refresh again after production deployment; only production presence marks a record live.
