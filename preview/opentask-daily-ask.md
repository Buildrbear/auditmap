# AuditMap Daily OpenTask Ask

Generated: 2026-08-20

## Current scoreboard

- **3,382** destination pages are live.
- **225** known destinations are in the hopper.
- **216** are generated locally but absent from production.
- **3** are research-only candidates awaiting launch-guide work.
- **6** are blocked by named review questions.
- **8** live records need internal local/production synchronization.

## Current operating ask

Claim one exact packet ID. Do not start a broad overlapping geography. Reconciliation and release work takes priority while the hopper exceeds 100 records. Every submission must return the packet ID, accepted record IDs, source URLs and checked dates, image-rights records where applicable, commands run, and an unresolved queue. OpenTask records coordination and credit; the repository registry remains the source of truth.

The production-sync queue is reserved for maintainers and repository integrators because it can overwrite newer live work. Community packets below cover evidence completion and reviewable release reconciliation.

## Open packets

| Packet | Work type | Geography | Records |
| --- | --- | --- | ---: |
| `research-completion-nc-asheville-01` | research-completion | NC / asheville | 1 |
| `research-completion-nc-boone-01` | research-completion | NC / boone | 3 |
| `research-completion-nc-concord-01` | research-completion | NC / concord | 1 |
| `research-completion-nc-fayetteville-01` | research-completion | NC / fayetteville | 1 |
| `research-completion-nc-greensboro-01` | research-completion | NC / greensboro | 2 |
| `research-completion-nc-raleigh-01` | research-completion | NC / raleigh | 1 |
| `release-reconciliation-fl-key-biscayne-01` | release-reconciliation | FL / key biscayne | 12 |
| `release-reconciliation-fl-miami-01` | release-reconciliation | FL / miami | 25 |
| `release-reconciliation-fl-miami-beach-01` | release-reconciliation | FL / miami beach | 14 |
| `release-reconciliation-in-indianapolis-01` | release-reconciliation | IN / indianapolis | 25 |
| `release-reconciliation-in-indianapolis-02` | release-reconciliation | IN / indianapolis | 17 |
| `release-reconciliation-mi-detroit-01` | release-reconciliation | MI / detroit | 25 |
| `release-reconciliation-mi-detroit-02` | release-reconciliation | MI / detroit | 25 |
| `release-reconciliation-mi-detroit-03` | release-reconciliation | MI / detroit | 5 |
| `release-reconciliation-oh-cincinnati-01` | release-reconciliation | OH / cincinnati | 14 |
| `release-reconciliation-oh-columbus-01` | release-reconciliation | OH / columbus | 25 |
| `release-reconciliation-oh-columbus-02` | release-reconciliation | OH / columbus | 25 |
| `release-reconciliation-oh-columbus-03` | release-reconciliation | OH / columbus | 3 |
| `release-reconciliation-wi-madison-01` | release-reconciliation | WI / madison | 1 |

## Daily merge rule

1. Refresh the registry before assigning work.
2. Reserve the packet ID in OpenTask and its linked GitHub issue.
3. Accept only source-format changes or the research handoff template.
4. Merge through reviewed pull requests and a Vercel preview.
5. Refresh again after production deployment; only production presence marks a record live.
