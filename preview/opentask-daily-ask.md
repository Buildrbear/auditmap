# AuditMap Daily OpenTask Ask

Generated: 2026-08-20

## Current scoreboard

- **3,382** destination pages are live.
- **74** known destinations are in the hopper.
- **15** are generated locally but absent from production.
- **49** are research-only candidates awaiting launch-guide work.
- **10** are blocked by named review questions.
- **0** live records need internal local/production synchronization.

## Current operating ask

Campaign capacity is 0/2 municipality-breadth and 0/1 depth lanes available. Do not claim a research-completion packet until independent review releases a breadth lane. Do not start another depth cluster.

Claim one exact available packet ID. Do not start a broad overlapping geography. The hopper is at or below 100 records, but breadth capacity is full, so release-reconciliation maintenance leads the available queue. Every submission must return the packet ID, accepted record IDs, source URLs and checked dates, image-rights records where applicable, commands run, and an unresolved queue. OpenTask records coordination and credit; the repository registry remains the source of truth.

The production-sync queue is reserved for maintainers and repository integrators because it can overwrite newer live work. Release-reconciliation maintenance does not open a new breadth or depth lane.

## Open packets

| Packet | Work type | Geography | Records |
| --- | --- | --- | ---: |
| `release-reconciliation-ak-anchorage-01` | release-reconciliation | AK / anchorage | 3 |
| `release-reconciliation-de-wilmington-01` | release-reconciliation | DE / wilmington | 2 |
| `release-reconciliation-ga-atlanta-01` | release-reconciliation | GA / atlanta | 3 |
| `release-reconciliation-pa-philadelphia-01` | release-reconciliation | PA / philadelphia | 3 |

## Capacity-blocked backlog

These packets remain visible for planning but are not claimable until the matching lane opens.

| Packet | Work type | Geography | Records |
| --- | --- | --- | ---: |
| None | — | — | 0 |

## Daily merge rule

1. Refresh the registry before assigning work.
2. Reserve the packet ID in OpenTask and its linked GitHub issue.
3. Accept only source-format changes or the research handoff template.
4. Merge through reviewed pull requests and a Vercel preview.
5. Refresh again after production deployment; only production presence marks a record live.
