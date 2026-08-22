# AuditMap Daily OpenTask Ask

Generated: 2026-08-22

## Current scoreboard

- **3,303** destination pages are live.
- **59** known destinations are in the hopper.
- **0** are generated locally but absent from production.
- **49** are research-only candidates awaiting launch-guide work.
- **10** are blocked by named review questions.
- **0** live records need internal local/production synchronization.
- **694** generated place pages are in the internal image-rights queue, representing **457** distinct image decisions.

## Current operating ask

Campaign capacity is 2/2 municipality-breadth and 1/1 depth lanes available. A municipality-breadth lane is available for an exact packet claim. A depth lane is available for a separately assigned cluster.

No unclaimed packets are currently generated. Run national discovery and qualify the next exact packet before assigning work. Every submission must return the packet ID, accepted record IDs, source URLs and checked dates, image-rights records where applicable, commands run, and an unresolved queue. OpenTask records coordination and credit; the repository registry remains the source of truth.

The image-rights packets are reserved for AuditMap's internal sessions and intentionally excluded from the OpenTask table. The production-sync queue is reserved for maintainers and repository integrators because it can overwrite newer live work. Release-reconciliation maintenance does not open a new breadth or depth lane.

## Open packets

| Packet | Work type | Geography | Records |
| --- | --- | --- | ---: |
| None | — | — | 0 |

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
