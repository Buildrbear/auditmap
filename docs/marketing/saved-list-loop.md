# Saved Places Sharing Loop

## Hypothesis

A person planning an outing is more likely to bring another visitor into AuditMap when several possibilities can be shared as one lightweight list. The recipient should understand the list immediately, open any public-place guide without an account, and optionally keep all destinations for later.

The loop is:

`save places -> share list -> recipient explores guides -> recipient saves list -> recipient visits, contributes, or shares again`

## Product Rules

- Sharing is always explicit; saving a place never publishes it.
- A utility URL contains only sanitized public place IDs, capped at 12.
- The URL contains no account ID, name, email, precise location, or visit history.
- Recipients can read the list and open every guide without signing in.
- “Save all places” merges the list with existing local or synchronized favorites.
- Shared-list URLs use `utm_campaign=saved_list_loop` so referrals remain distinguishable from search, social, and direct traffic.
- Utility URLs remain non-canonical; the nationwide place pages remain the search surfaces.

## Measurement

Measure these events as one funnel:

| Stage | Event | Meaning |
| --- | --- | --- |
| Planning | `Place saved` | A visitor kept at least one destination. |
| Distribution | `Saved list shared` | A visitor intentionally sent or copied a list. |
| Referral | `Shared list opened` | A recipient reached the list. |
| Retention | `Shared list saved` | A recipient kept the destinations. |
| Visit intent | `Directions opened` | A sender or recipient moved toward a visit. |
| Contribution | `Crumb submitted` | The loop improved a public-place record. |

Primary metrics are shared-list opens per share and downstream useful actions per shared-list open. A useful action is a list save, place share, directions open, or submitted Crumb.

## Decision Rules

- Keep the loop if recipients open guides or produce useful actions without increasing bounce from the map.
- Rewrite the sender prompt if people save multiple places but rarely share.
- Rewrite the recipient context if lists open but recipients do not open guides or save destinations.
- Do not infer a completed visit from a directions click or shared-list open.
- Do not add collaborative editing until the one-way share loop demonstrates real use; collaboration adds identity, moderation, and notification complexity.

## Verification

- `npm run test:saved-list-loop`
- Browser check at 390 pixels: shared list opens automatically, three rows fit without horizontal overflow, and “Save all places” confirms retention.
- Browser console: no errors during open or save.
- Hosted preview must contain the list sanitizer, 12-place cap, attribution parameters, share/open/save events, and responsive styles.
