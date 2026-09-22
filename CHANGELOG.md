# Changelog

## 0.3.0 — 2026-09-22

Focused on replayability and shareability without weakening the deterministic referee.

### Added
- Five new graded microgames: physical-position interference, letter counting, second-largest selection, exact-pair matching, and forbidden-value avoidance.
- A compact end-of-run incident status used on the result card and in challenge share text.
- Replay-variety evidence across 500 fixed seeds.

### Changed
- Ruleset bumped from 2 to 3 because fixed-deck challenge sequencing changed. Old v2 challenge links fail closed instead of silently becoming a different test.
- Only the first three onboarding beats are fixed. Seeded variety begins on screen four while the first memory recall remains deterministic.
- Later memory beats are spaced out so practice mode still presents one neutral setup screen within its ten graded questions.
- Failure commentary now reacts to several specific trap types while continuing to target the mistake, not the player.

### Qualified
- 39/39 deterministic tests and all bounded static security/performance checks pass.
- Chrome desktop, touch, small-mobile/reduced-motion and deliberate-loss paths pass.
- Real-time adaptive run completed 113 screens with 104/104 graded answers correct and no runtime/layout errors.
- Across 500 challenge seeds, v0.3 produced 500 distinct first-10 template sequences; v0.2 used one fixed first-10 sequence.

## 0.2.0 — 2026-09-22

Rebuilt the HUMAN ERROR prototype around a strictly typed, DOM-independent referee.

### Fixed
- Ungraded memory displays and unfinished final tasks counted against accuracy.
- Failed memory recall returning repeatedly.
- Stale/duplicate inputs lacking a round identity.
- Split reaction/deadline state between event callbacks and rendering.
- Incorrect first streak/multiplier reporting.
- Final-life loss racing a survival bonus.
- Inactive-tab time loss, idle frame loops, and small-screen overflow.

### Added
- Twelve graded task templates plus neutral memory setup.
- Per-answer receipts, in-place result review, and local JSON export.
- Bounded, reproducible challenge URLs and separate adaptive/fixed-deck modes.
- Untimed practice, keyboard/touch controls and a software-keyboard-free spelling keypad.
- Opt-in generated audio, reduced-motion support and a responsive single-view layout.
- MIT source, strict TypeScript, pinned development tooling and zero runtime dependencies.
- Regression, generator, browser, HTTP and bounded static-security checks.

### Not included
- Public hosting/repository publication, verified rankings, real-device Safari testing or independent security certification.
