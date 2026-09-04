# AuditMap Daily OpenTask Ask

Generated: 2026-09-04

## Current scoreboard

- **3,303** destination pages are live.
- **67** known destinations are in the hopper.
- **0** are generated locally but absent from production.
- **51** are research-only candidates awaiting launch-guide work.
- **16** are blocked by named review questions.
- **0** live records need internal local/production synchronization.

## Current operating ask

Campaign capacity is 2/2 municipality-breadth and 1/1 depth lanes available. A municipality-breadth lane is available for an exact packet claim. A depth lane is available for a separately assigned cluster.

Claim one exact available packet ID. Do not start a broad overlapping geography. The hopper is at or below 100 records, so evidence-completion packets may lead the open queue; preserve WIP caps and finish claimed work before expanding. Every submission must return the packet ID, accepted record IDs, source URLs and checked dates, image-rights records where applicable, commands run, and an unresolved queue. OpenTask records coordination and credit; the repository registry remains the source of truth.

The production-sync queue is reserved for maintainers and repository integrators because it can overwrite newer live work. Release-reconciliation maintenance does not open a new breadth or depth lane.

## Open packets

| Packet | Work type | Geography | Records |
| --- | --- | --- | ---: |
| `research-completion-pa-brogue-01` | research-completion | PA / brogue | 1 |
| `research-completion-pa-york-01` | research-completion | PA / york | 7 |

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
