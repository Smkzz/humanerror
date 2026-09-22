# Changelog

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
