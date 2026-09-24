# Changelog

## 0.7.0 — 2026-09-24

Competition release for Hackyard Yard #3 — One Screen.

### Added
- 132 total mission templates across five categories, including 50 v0.7 additions with independent visible-answer oracle coverage.
- Player-name entry, local competition history, shared top-ten leaderboard, and server-replayed Adaptive score submissions.
- Short-lived one-use run sessions bound to the exact game version, ruleset, seed, and run identity.
- Build provenance checks covering the standalone HTML and compiled server-module set.
- Release CI, exact-state browser receipts, mission-quality metrics, and judge-focused competition documentation.

### Changed
- Adaptive runs use randomized openings, no-replacement mission selection, four difficulty levels, and bounded pacing up to 1.39×.
- Ranked scores are no longer trusted from the browser; bounded input events are replayed by the server through the same deterministic referee.
- Build tooling is lockfile-pinned to TypeScript 5.8.3 and Bun 1.4.0 and fails closed without local tools.
- Main-thread stall fallback now targets extended suspension-scale gaps while explicit blur/visibility handlers cover normal tab changes.
- Browser HUD work during feedback was reduced without changing scoring or timing semantics.

### Fixed
- Ambiguous or leaking mission contracts across alphabetization, key mapping, error checking, primes, weighted means, n-back, set difference, homographs, homophones, syllogisms, timelines, odd-one-out, spatial wording, and combinations.
- Player-name changes can no longer create or transfer local scores.
- Leaderboard storage admission is bounded and queued operations share an enqueue deadline.
- Streaming request bodies above 64 KiB are rejected before EOF and the connection is closed.
- Alphabetization is locale-independent and build output is LF-normalized for cross-platform reproducibility.
- Brief scheduler stalls no longer falsely pause active play.
- `keymap` now displays the literal numeric key each option actually accepts, eliminating shuffled shortcut ambiguity.
- Browser all-template qualification now asserts every settlement, deck completion, and final graded-result parity instead of coverage alone.
- Release evidence is LF-normalized and CI verifies committed checksums plus browser-receipt identity against the manifest.

### Qualified
- 88/88 Node tests PASS plus the bounded static security/size audit.
- 132/132 desktop and 132/132 360×640 touch mission sweeps PASS with no repeats, JavaScript errors, unexpected network requests, or qualification layout failures.
- Timed Adaptive run: 82 unique screens, 80/80 graded correct, 60,000 ms active play, Level 4, 1.39× max tempo, score 53,452.
- Server replay matched the browser exactly and the leaderboard submission was accepted.
- Exact artifact: 103,057 raw / 38,360 level-9 gzip bytes, SHA-256 `b3e5934fadb5cd4a72396f309b399b0ca75b5252bcd55a87322e85037dcee1b5`.

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
