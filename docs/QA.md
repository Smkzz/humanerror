# QA receipt — HUMAN ERROR 0.7.0

Qualification date: **2026-09-24**

This section is the current release evidence. Older sections below are retained as historical development receipts and do not supersede v0.7.

## Exact release artifact

- Version / ruleset: **0.7.0 / 7**
- Portable release: `dist/index.html`
- Runtime npm dependencies: **0**
- Size: **103,057 raw / 38,360 gzip bytes** using the same level-9 gzip measurement as the manifest
- Release limits: **<126,976 raw / <39,936 gzip bytes**
- HTML SHA-256: `b3e5934fadb5cd4a72396f309b399b0ca75b5252bcd55a87322e85037dcee1b5`
- Compiled server modules: **12**
- Server-module set SHA-256: `a8829c8eb2caf35288a8ba37713d17ac5e5c339d8e6d81a0c28f3b90329f2412`
- Build tools: TypeScript **5.8.3** and Bun **1.4.0**, both lockfile-pinned development dependencies

## Release gate

Final post-hardening `npm run check`: **PASS**.

- **88/88 Node tests passed**, no failures, skips or todos.
- The new security regression proves an oversized chunked request is rejected with 413 and connection close **before EOF** once the 64 KiB body limit is crossed.
- The bounded static audit passed its CSP, unsafe-sink, same-origin network, runtime-dependency, size and build-identity checks.
- Manifest raw bytes, level-9 gzip bytes and SHA-256 are asserted against the actual built HTML.
- The release build invokes only the lockfile-installed TypeScript and Bun executables; no global compiler/bundler fallback is accepted.
- High-confidence secret signature scan over publishable files found no private-key, GitHub-token, AWS-key or OpenAI-style secret matches.
- The default `.runtime-v7/` leaderboard directory is Git-ignored.
- Publishable UTF-8 text is LF-normalized before `SHA256SUMS` generation; `npm run verify:evidence` checks the committed checksums and binds the browser receipts to the current manifest.

## Generator and oracle evidence

- **132 templates × 1,000 seeds** satisfy valid answer-contract and uniqueness invariants.
- The **50 v0.7 additions × 1,000 seeds** pass independent visible-answer oracles.
- The global empty/undefined-choice invariant was exercised over **264,000 generated instances** with no blank or undefined option labels.
- Same seeds reproduce byte-for-byte deterministic questions.
- Challenge and Adaptive no-replacement invariants are covered over large seeded runs.
- Question entropy across 100 seeds per template: minimum **4**, median **100**, mean **93.41**, maximum **100**.
- The only templates below 30 visible signatures are intentionally finite response mechanics: `reaction`, `override` and `suppressrepeat`, each **4/4** against its explicit target.

Evidence: `qa/v07-question-entropy.json`, the Node test suite and the mission catalogue.

## Exact browser evidence

### All-template desktop

`qa/v07-all-132-desktop.json`: **PASS**

- viewport **1280×900**
- keyboard input
- **132/132 templates settled correctly**
- **131/131 graded missions correct + 1 neutral memory setup**
- deck finished with final result **131/131**
- no template repeats
- Level 4 reached
- **0 JavaScript errors**

### All-template small mobile

`qa/v07-all-132-small.json`: **PASS**

- viewport **360×640**
- touch input
- **132/132 templates settled correctly**
- **131/131 graded missions correct + 1 neutral memory setup**
- deck finished with final result **131/131**
- no template repeats
- Level 4 reached
- no recorded undersized controls or overflow failures in the qualification run
- **0 JavaScript errors**

These are browser-emulated viewports, not claims of physical-device certification.

## Timed Adaptive + server replay

`qa/v07-browser-server.json` records the final timed qualification:

- **82 unique active screens**
- **80/80 graded answers correct**
- **60,000 ms active play**
- Level 4 / **1.39× maximum tempo**
- browser score **53,452**
- server replay score **53,452**
- browser/server result parity: **true**
- replay validation: **server-replayed**
- leaderboard submission accepted: **true**
- same-origin API responses: leaderboard **200**, session issue **201**, submission **200**
- **0 JavaScript errors**

The recorded wall time is longer than 60 seconds because feedback, arming guards and non-active phases deliberately do not spend the 60-second active-play budget.

## Security and trust boundaries

The shared board never trusts a client-provided score. A ranked Adaptive start receives a short-lived one-use session bound to the release identity. The server validates the bounded transcript, timing and submission shape, replays the events through the compiled referee, and stores only the server-computed result.

This is a casual leaderboard, not proof of human play or bot resistance. Names are public display labels without identity verification. See [SECURITY.md](../SECURITY.md).

## What this qualification does not establish

The release evidence does not certify:

- physical iOS/Android behavior;
- Safari/Firefox compatibility;
- full assistive-technology or WCAG compliance;
- public production operations at scale;
- independent penetration testing;
- bot-proof competitive integrity;
- fresh-player comprehension, humor or replay desire.

Those require separate human/device/operational validation. The automated evidence establishes deterministic correctness and the tested browser/server contracts, not subjective fun.

---

# Historical QA archive

## HUMAN ERROR 0.3.0


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

---

## v0.4.0 local launch-readiness qualification (2026-09-23)

This is an additive receipt for the uncommitted candidate at `720e770d28a8000cbe7a272e38c5d77c503b1809` on `feature/v0.4-personal-leaderboard-variety`. The historical v0.3 qualification above remains intact and was not reused as v0.4 evidence. No commit, merge, push or deployment occurred.

- `npm run typecheck`: **PASS**.
- `npm run check`: **61/61 Node tests PASS** and static audit **PASS** (12 bounded checks).
- `npm run test:browser`: **PASS** in Chromium `154.0.8037.57` at desktop keyboard `1280×900`, mobile touch `390×844`, and reduced-motion small mobile `360×640`; no overflow, undersized controls, JavaScript errors or runtime requests. v0.3 and v0.4 keyboard/touch fixtures passed. Legacy v3 best and v4 local-profile migration were exercised in-browser.
- Failure browser path: **PASS**, 0/4 after four graded mistakes, 1 ungraded setup, `1366×768`, no overflow.
- Live same-origin server run: **169 screens, 156/156 correct, 100%, 193.2 seconds**, no JavaScript errors; board `200`, run session `201`, submission `200`; server-replayed result `116,810`, rank `#1`, persisted under the temporary test `DATA_DIR`. Final result viewport `1366×768` had no overflow.
- Fresh-context readback after service restart: **PASS**. Empty initial local profile; same-origin board `200`; second browser displayed the persisted `116,810` result with no external requests, errors or overflow.
- Artifact `dist/index.html`: **94,846 bytes raw / 28,052 bytes gzip**, 0 runtime dependencies, SHA-256 `736a24a892153e8df391a7429571a2adc8e3b51227c4b1ede5ed5a58b45ec9a5`. Two consecutive builds were byte-identical and `dist/manifest.json` matched.
- `qa/static-audit.json`, `qa/browser-all.json`, `qa/browser-failure.json`, `qa/v03-browser-fixtures.json`, `qa/v04-browser-fixtures.json`, `qa/timed-adaptive.json`, `qa/shared-browser-read.json` and the corresponding screenshots hold the detailed evidence. The original dirty v0.4 state and QA files remain preserved at a task-local backup under the system temp directory.

The score server replays the bounded Adaptive transcript through the built referee, binds one-use sessions to version/ruleset/seed/run ID, enforces minimum elapsed referee time, assigns timestamps, and persists only recomputed results. It is tamper-resistant against simple score editing, not bot-proof: anonymous names can be reused and automated runs can wait out the timing gate. A supervised human playtest is appropriate behind same-origin TLS with persistent backed-up `DATA_DIR`; these receipts do not establish human feedback, mobile-device/browser compatibility, public deployment, or security certification. See [`LAUNCH_READINESS.md`](LAUNCH_READINESS.md) for deployment conditions and residual risks.
# v0.6 size-budget evidence recorded before budget update

The v0.5 artifact and its `qa/static-audit.json` receipt are preserved at `qa/v05-static-audit.json` before changing the build audit. The v0.5 artifact measured **106,376 raw / 30,708 gzip** against strict limits of **112,640 raw / 30,720 gzip**; gzip headroom was only **12 bytes**. The v0.6 artifact measured **125,170 raw / 37,909 gzip**, an increase of **18,794 raw / 7,201 gzip** and an overage of **12,530 raw / 7,189 gzip** under those original limits. The compiled shared generator for the 50 new mechanics is **21,581 raw / 7,521 gzip** by itself.

The v0.6 implementation shares one option-construction, shuffle and uniqueness guard across all additions; one category/duration table; the existing choice renderer and seeded random source; and one generic bridge into the referee. Every new decision rule still requires its own deterministic visible-contract logic and independent oracle. Keeping all 82 mechanics inside the single-file offline artifact means the 50 new rule implementations cannot be moved out of the bundle without losing portability or changing the runtime model. No CSP, runtime dependency, network, sanitizer, or provenance check is implicated in the size increase.

This measurement was recorded before updating the candidate gate. The new v0.6 strict limits are **126,976 raw (124 KiB) / 39,936 gzip (39 KiB)**. These remain bounded byte ceilings; all non-size static audit checks and both artifact identity checks remain in force. The v0.5 limit and receipt remain unchanged as historical evidence.
## v0.6.0 local candidate qualification (2026-09-23)

This receipt applies to the current uncommitted worktree based on `a7d9cbd95dfa260600eefc3f75480419f9e6d84f` on `feature/v0.4-personal-leaderboard-variety`. It does not replace or reinterpret the historical v0.3/v0.4/v0.5 receipts above.

- Inventory: **82 TOTAL TEMPLATES**, **50 NEW TEMPLATES**, **0 SAME-TEMPLATE REPEATS PER RUN**. The IDs, visible contracts, mechanics, durations and similarity review are in [`MISSION_CATALOGUE.md`](MISSION_CATALOGUE.md).
- Version binding: game `0.6.0`, ruleset/challenge version `6`; v6 local preference/profile keys and `.runtime-v6` server data directory. Browser migration preserved v5 keys, migrated `Old Player` and the sound setting, set the v6 best to zero, and imported no local or shared scores.
- `npm run typecheck`: **PASS**. `npm run check`: **79/79 Node tests PASS**, no skips; bounded static audit **12/12 PASS**. The full audit checks exact CSP hashes, same-origin network use, no unsafe sinks/eval, no external script/style, zero runtime dependencies, strict v0.6 artifact budget, and build/manifest SHA identity.
- Seeded tests: all 50 new generators each passed **1,000** independent visible-contract oracle cases, including unique choices, ranges, prompt integrity and timing; 82 template contracts also ran over 1,000 seeds. Challenge completed 1,000 seed-bound full decks with deterministic output despite different histories; Adaptive completed 1,000 varied-history full-deck no-repeat sequences with weakness weighting and recovery checks. Practice/Challenge engine fixtures consumed 82 unique entries and ended as explicitly exhausted.
- `npm run test:browser`: **PASS** in Google Chrome `154.0.8037.57`. Exact artifact Practice passed by keyboard at `1280×900`, touch at `390×844`, and reduced motion/touch at `360×640`; all completed 10/10, no repeated template, no JS errors, no runtime calls from offline pages, no overflow or undersized targets. The four-error failure path produced 0/4 and zero score.
- Challenge coverage: desktop keyboard and mobile touch each visited **20 consecutive templates**, including **10 new mechanics** per run; both viewports produced the same seeded sequence with no repeat. Both reached Level 4, displayed **1.39× tempo**, activated the noninteractive distraction layer, and had no horizontal/vertical overflow, undersized controls, console/page errors or network requests.
- Live Adaptive coverage: **49 templates shown**, **48 rounds completed**, **47/47 graded correct**, including 28 new templates. The isolated loopback server issued a v6 run session and accepted the final time-ended submission (`200`, `validation=server-replayed`) in Chromium. Browser/server score, correct count and attempted count matched exactly (**26,795 / 47 / 47**); one new v6 leaderboard entry was persisted in a temporary test-only data directory. No external calls occurred.
- Artifact `dist/index.html`: **125,170 raw / 37,909 gzip bytes**, 0 runtime dependencies; SHA-256 `a00ba253d7691f5c2aac5dd33f590b7df79d56d060a9e23d2e65daee8a0fc8aa`. Manifest version/ruleset and the 10-file compiled server-module identity matched. The strict v0.6 limits are **126,976 raw / 39,936 gzip bytes**. The evidence and reason for the candidate-specific size ceiling were recorded above before the audit change; the v0.5 receipt is preserved at `qa/v05-static-audit.json`.
- Browser and audit receipts: `qa/v06-browser-all.json`, `qa/v06-browser-failure.json`, `qa/v06-browser-qualification.json`, `qa/v06-timed-adaptive.json`, `qa/static-audit.json`; screenshots are prefixed `v06-`. The combined command log is `qa/v06-test-browser.log`.
- No commit, push, merge, publication or deployment occurred. These local checks do not establish human comprehension/replay desire, physical-device compatibility, Safari/Firefox support, assistive-technology usability, hosted operator readiness or production security certification.

---

## v0.7.0 local candidate qualification (2026-09-24)

This additive receipt applies to the uncommitted v0.7.0 / ruleset 7 candidate in `C:\Projects\Human-Error-v04-dev`, based on `a7d9cbd95dfa260600eefc3f75480419f9e6d84f` on `feature/v0.4-personal-leaderboard-variety`. Earlier v0.3–v0.6 receipts and QA artifacts remain historical and were not treated as v0.7 evidence.

- Inventory: **132 TOTAL TEMPLATES**, including **50 NEW V0.7 TEMPLATES**; Adaptive, Challenge and Practice use no-replacement scheduling, with explicit finite-deck exhaustion. Same-seed questions reproduce exactly; the opening pool is seed-randomized and memory recall remains paired with a 2–7 question gap.
- `npm run typecheck`: **PASS**. `npm test`: **84/84 passed**, no skips. The suite includes 132,000 generator cases over 1,000 seeds per template, 50,000 independent v0.7 visible-contract oracle cases, deterministic Challenge deck/no-repeat checks, Adaptive no-repeat/history checks, and memory-pair validation.
- `qa/v07-question-entropy.json`: 132 templates × 100 seeds. Overall unique-question count per 100 seeds: minimum **4**, median **100**, mean **92.77**, maximum **100**. Family minima: numeric/procedural **80** (target ≥80), grid/state/symbolic **63** (target ≥60), vocabulary/semantic **43** (target ≥30). Only `reaction`, `override`, and `suppressrepeat` are below 30; each has an explicitly constrained response domain. The 16-entry warm-start pool appears across the 1,000-seed distribution.
- `npm run test:browser`: **PASS** in Chrome `154.0.8037.57` against the exact built `dist/index.html`. Challenge used keyboard at desktop `1280×900` (32 screens, 18 new templates; a repeated-seed run matched all visible signatures; a second seed differed), touch at `390×844` and reduced-motion touch at `360×640` (12 screens each). The focusfilter task was separately exercised at desktop and mobile through screen 16. All cases had no repeated template, viewport overflow, undersized controls, JavaScript errors or external requests; Challenge reached Level 4 and exercised the distraction UI.
- Live Adaptive used a fresh local Node server and temporary `DATA_DIR`: **96 screens**, **94/94 graded correct**, score **64,288**, no template repeat, Level 4 / **1.39×** tempo. The browser submitted a time-ended run (`activeMs=60,000`); the service returned board `200`, session `201`, replay submission `200`, and `validation=server-replayed`. Browser and server score/correct/attempted values matched; the temporary leaderboard accepted the entry. No JavaScript errors; runtime requests stayed on the same origin.
- Exact build manifest: **171,349 raw / 54,389 gzip bytes**, 0 runtime dependencies, HTML SHA-256 `81db0a872aad58c29c9a538a11dc2e201696087b6108ff1b31ca130605036082`; 12 compiled server modules, set SHA-256 `71748bcbd96bab592bcb082ae836cc6f4e18d266e1c11d3081c59becc10f2535`.
- The unchanged strict limits remain **less than 126,976 raw bytes and less than 39,936 gzip bytes**. `node scripts/audit.mjs` stops at the raw-size assertion: this artifact is **44,374 bytes above the largest permitted raw size**. Its manifest gzip count is **14,454 bytes above the largest permitted gzip size**; the audit does not reach the gzip assertion after raw fails. No limit was changed and no v0.7 static-audit PASS receipt was created; `qa/static-audit.json` remains the historical v0.6 receipt. **The v0.7 candidate is not releasable under the current size gate.**
- Receipts: `qa/v07-browser-challenge.json`, `qa/v07-browser-server.json`, `qa/v07-question-entropy.json`, `qa/v07-human-samples.json`, and screenshots prefixed `qa/v07-browser-`. `git -c core.whitespace=cr-at-eol diff --check` passed; it preserves the repository’s existing mixed line endings instead of rewriting unrelated content.
- No commit, push, merge, publication or deployment occurred. This local automation does not establish human playtest feedback, physical iOS/Android behavior, Safari/Firefox support, assistive-technology usability, hosting/operator readiness or formal security/accessibility certification.
