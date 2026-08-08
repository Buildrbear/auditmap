# AuditMap Community Experience Plan

## Product position

AuditMap is a place-based community for understanding and improving public spaces. The place is the community, the map is its homepage, and every contribution should reduce uncertainty for the next visitor.

AllTrails is a quality benchmark for outdoor warmth and confident map-led utility, not a template. The AuditMap experience blends:

- ChatGPT's conversational clarity and guided questions.
- Apple's restraint, progressive disclosure, and attention to detail.
- AllTrails' calm outdoor palette, practical hierarchy, and low-friction participation.

The result should feel unmistakably AuditMap: civic, welcoming, evidence-aware, and useful before it is social.

## Community loop

The core participation loop is:

**Ask -> Observe -> Confirm -> Correct -> Fix -> Thank**

Community features should strengthen this loop rather than reward posting volume. Questions create research opportunities. Observations add lived context. Confirmations and corrections improve reliability. Replies resolve uncertainty. Thanks recognize useful work.

## Experience principles

1. Start with human intent, not database fields. Ask people whether they want to ask, share, or fix and confirm.
2. Keep every conversation attached to a public place, mapped feature, or coordinate.
3. Reveal extra choices only when they are needed.
4. Separate current conditions from lasting knowledge.
5. Make verification and source context visible without making the interface feel bureaucratic.
6. Prefer a calm place log over a generic social feed.
7. Keep browsing and public information open. Require an account only when an action needs identity, moderation, or impact tracking.
8. Do not mix contribution prompts with fundraising prompts. Each moment should have one clear job.
9. Design for accessible participation, including clear language, keyboard operation, visible focus, large touch targets, and non-color state indicators.

## Release 1: Clear community entry

This release establishes the foundation:

- One community invitation on every place page.
- Three primary actions: Ask, Share, and Fix or confirm.
- A guided composer with progressive options for tips, conditions, photos, panoramas, questions, and verification.
- Place, mapped-area, live-location, and dropped-pin context.
- A filterable place log for questions, updates, and confirmed information.
- Existing moderation, reporting, replies, media handling, contributor profiles, and recognition remain intact.
- Community-specific forest and sage styling that complements the main AuditMap system.

## Next releases

### Map experience: the pull-up map deck

On mobile, the map remains the spatial canvas and a pull-up deck becomes the primary exploration surface. It should feel like one continuous interface rather than a map, results page, and place card competing for attention.

The deck has three stable states:

1. **Peek** keeps most of the map visible. It shows the current area, result count, and a clear pull handle. This is the resting state while panning or orienting.
2. **Browse** occupies roughly half the screen. It shows nearby places, active filters, and enough context to compare choices while the corresponding markers remain visible.
3. **Focus** opens after selecting a marker or result. It shows one place's image, name, type, rating, open status, and essential details, with clear actions to view the guide, ask, save, navigate, or contribute.

Pulling upward moves to the next state. Pulling downward returns to the previous state. Horizontal swipes in Focus move between nearby places without changing map scale. Tapping the handle provides the same movement for people who do not use drag gestures.

The map and deck stay synchronized:

- Selecting a marker opens Focus and highlights the matching result.
- Selecting a result centers and highlights its marker.
- Moving the map returns the deck to Peek and offers **Search this area** rather than silently replacing results.
- The map applies bottom padding equal to the visible deck so the selected marker is never hidden behind it.
- Search, filters, radius, and location update both the visible markers and deck contents.
- The back action reverses one deck state before leaving the map.

Community belongs inside Focus without overwhelming discovery. A compact status can show recent conditions, an unanswered question, or a confirmed detail. **Ask**, **Share**, and **Fix or confirm** open the same guided composer used on the place page, already attached to the selected place or coordinate.

Accessibility requirements:

- Dragging is never the only way to change state; the handle remains a real button with an updated accessible label.
- Focus moves predictably when a place is selected by keyboard or assistive technology.
- State changes are announced without reading the entire result list again.
- Touch targets remain at least 44 pixels, motion respects reduced-motion preferences, and the deck does not trap zoom or scrolling gestures intended for the map.

The existing mobile sidebar, place preview, swipe handling, map selection, search, radius, filters, and Ask AuditMap bar provide the technical foundation. Implementation should consolidate them into this state model rather than add another overlay.

### Release 2: Better conversations

- Open questions and recently changed conditions rise to the top.
- Resolved questions receive a clear accepted or verified answer state.
- Replies use the same calm composer and preserve the original contribution intent.
- Contributors can follow a place or a specific question without creating a noisy global feed.

### Release 3: Guided field contribution

- QR signs open directly to the correct place and contribution context.
- On-site prompts ask one useful, answerable question at a time.
- Uploaded images inherit a coordinate or mapped-feature association when permission is granted.
- Accessibility, conditions, entrances, amenities, and missing-map details receive tailored prompts.

### Release 4: Community map layer

- Questions, observations, images, corrections, and verified details can be explored spatially.
- Duplicate reports cluster into one issue or knowledge thread.
- Place stewards and municipalities can see unresolved gaps, recent confirmations, and coverage.
- Public contribution data can strengthen an open public-place registry with clear provenance and use rights.

## Measures of success

- More visitors start and complete a useful contribution.
- Questions receive helpful replies or researched answers.
- A growing share of contributions include a place, feature, or coordinate context.
- Corrections and confirmations improve record freshness.
- Reports and moderation burden remain low.
- Contributors return because they can see places helped, not because the interface manufactures engagement.
- Municipalities and nonprofits can understand where information came from and how recently it was checked.

## Guardrails

- No generic outrage feed, popularity contest, or engagement bait.
- No copying another product's exact layout, visual assets, language, or interaction patterns.
- No unlabelled blending of AI answers, official sources, and community observations.
- No public exposure of precise personal location beyond the coordinate a contributor knowingly attaches to a place record.
- No claim that a community confirmation replaces a professional accessibility, safety, or legal audit.
