# QA receipt — HUMAN ERROR 0.3.0

Qualification date: **2026-09-22**

## Exact release artifact

- Version: **0.3.0**
- Challenge ruleset: **3**
- Runtime dependencies: **0**
- HTML size: **84,569 bytes**
- Gzip size: **22,889 bytes**
- SHA-256: `1b38057d79b5a09ddfd9be9740b830a08c6a7f5bec7d7011b12614abd17ca1d4`
- Manifest: `dist/manifest.json`
- Portable release: `dist/index.html`

## Qualification environment

- Canonical workspace: `C:\Projects\Human Error`
- Node.js: **24.18.0**
- npm: **11.16.0**
- TypeScript: **5.8.3** from the pinned lockfile
- Playwright: **1.57.0** in the ignored project `.venv`
- Chrome/Chromium: **153.0.8010.53**

## Deterministic referee and generator gate

Final `npm run check` result: **PASS**.

- **39/39** Node tests passed.
- All **18 bounded generators** were exercised across 1,000 seeds each.
- The five v0.3 microgames have independent answer oracles.
- Challenge scheduling remains reproducible and independent of player success history.
- Adaptive scheduling does not repeat the same template back-to-back.
- Memory setup/recall accounting, duplicate/stale input rejection, deadline handling, pause semantics, reaction presentation, scoring conservation and final-life precedence remain covered.
- The override task now requires renderer-confirmed bait presentation; elapsed cue time alone cannot make a still-invisible input count.

## Bounded static/security/performance gate

Result: **PASS**.

The static audit verified:

- exact script CSP hash;
- exact stylesheet CSP hash;
- no `unsafe-inline` or `unsafe-eval`;
- network denied by CSP;
- no HTML string sinks in the app;
- no runtime code evaluation;
- no fetch/WebSocket/interval loops in the app;
- no third-party script or stylesheet loads;
- zero runtime dependencies;
- release below **90 KiB raw / 25 KiB gzip**;
- built SHA-256 matches the manifest.

This is a bounded static audit, not a penetration test or security certification.

## Standard browser qualification

The exact built artifact was played in Chrome 153 using an independent visible-text solver.

| Case | Viewport | Input | Result |
|---|---:|---|---|
| Desktop | 1280×900 | keyboard | **10/10 PASS** |
| Mobile | 390×844 | touch | **10/10 PASS** |
| Small mobile | 360×640 | touch + reduced motion | **10/10 PASS** |

Across those runs:

- no JavaScript errors;
- no app runtime/network requests;
- no horizontal or vertical overflow at the tested viewports;
- no enabled controls below the 44 px target-size gate;
- pause/resume preserved the active question;
- answer review remained consistent with the 10/10 result.

Evidence: `qa/browser-all.json` plus screenshots.

## Deterministic v0.3 browser coverage

A fixed challenge seed, **`coverage-2`**, was played twice: once with keyboard input and once with touch.

Both runs deterministically reached all five new games:

- `second` — including its four-option layout;
- `position`;
- `lettercount`;
- `avoid`;
- `match`.

The position task was additionally checked for accessible names that state the **physical position**, printed label and keyboard shortcut, e.g. “Left position, printed LEFT, shortcut 1”.

The override renderer boundary was reproduced separately:

- an input crossing the cue deadline **before the bait could paint** was ignored;
- the same input **after the bait rendered** was graded.

Evidence: `qa/v03-browser-fixtures.json`.

## Deliberate-loss path

Result: **PASS**.

- Correct: **0**
- Graded: **4**
- Score: **0**
- Neutral memory setup screens excluded: **1**
- No JavaScript or layout failures.

Evidence: `qa/browser-failure.json`.

## Real-time adaptive stress run

Result: **PASS**.

- Screens displayed: **102**
- Graded answers: **94**
- Correct answers: **94**
- Accuracy: **100%**
- Wall-clock duration: **140.67 s**
- Displayed active seconds remaining at finish: **0.0**
- JavaScript errors: **0**
- Runtime requests: **0**
- Layout violations: **0**

The run is intentionally longer than 60 wall-clock seconds because feedback, guards and pauses do not spend the 60-second **active-task** budget.

Evidence: `qa/timed-adaptive.json`.

## Replay-variety evidence

Across **500** fixed challenge seeds:

- v0.3 produced **500 distinct first-10 template sequences**;
- the v0.2 baseline used one fixed first-10 template sequence.

This demonstrates that the old structural repetition was removed. It does **not** establish player fun, humor quality or replay desire.

Evidence: `qa/replay-variety.json`.

## HTTP transport qualification

The loopback development server served the exact built page at `http://127.0.0.1:4173/`.

- Status: **200**
- Body size: **84,569 bytes**
- Body SHA-256: `1b38057d79b5a09ddfd9be9740b830a08c6a7f5bec7d7011b12614abd17ca1d4`
- Content-Type: `text/html; charset=utf-8`
- Live-URL Chrome desktop playthrough: **10/10 PASS**
- Live-URL JavaScript errors: **0**
- Live-URL app runtime requests: **0**

Evidence: `qa/http-identity.json` and `qa/browser-desktop-keyboard.json`.

## Independent review

A read-only independent GPT-6 Astra review first found four P2 concerns plus two P3 polish items:

1. physical-position accessibility labels;
2. fair-comparison disclosure in share text;
3. deterministic browser coverage for all new games;
4. override input becoming gradable before its bait was rendered;
5. timeout narration implying an action that never happened;
6. personal best persisting across incompatible rulesets.

All six were fixed. The same reviewer re-checked the changes and reported **all six findings closed with no new blocker**. The browser fixtures were then run independently in this qualification and passed.

This review is supporting engineering evidence, not a formal accessibility or security certification.

## Important limits

Not established by this qualification:

- physical iPhone or Android devices;
- Safari or Firefox compatibility;
- full screen-reader usability with assistive technology;
- verified/public leaderboard integrity;
- anti-cheat guarantees;
- public production hosting;
- a scientific cognitive assessment;
- a guaranteed “10/10 fun” rating.

Fresh-player testing remains the correct next gate for humor, clarity and replay desire. See `docs/PLAYTEST.md`.
