# QA receipt — HUMAN ERROR 0.2.0

## Exact release artifact

- Ruleset: `2`
- HTML size: **77,163 bytes**
- Gzip size: **20,973 bytes**
- Runtime dependencies: **0**
- SHA-256: `7972bfb01917ac1cee58db562e8684ac3fa974f5719dd5a5caec72ab49e84270`
- The canonical repo rebuilt the exact same release artifact on 2026-09-22 after QA/dev-server hardening.

## Canonical repo qualification — 2026-09-22

Environment:

- Windows local qualification through the authorized `C:\Projects\Human Error` workspace
- Node.js **24.18.0**
- npm **11.16.0**
- TypeScript **5.8.3** from the pinned lockfile
- Playwright **1.57.0** in an ignored project `.venv`
- Google Chrome / Chromium **153.0.8010.53**

| Check | Result |
|---|---|
| Clean `npm ci --ignore-scripts` | PASS; 1 dev package installed, 0 reported vulnerabilities |
| Strict TypeScript build | PASS |
| Node automated test cases | 37/37 PASS |
| Generated question contracts | 13 templates × 1,000 seeds; PASS |
| Independent arithmetic oracle | PASS |
| Independent magnitude/parity/word/opposite oracles | PASS |
| Generated complete-run invariants | 300 runs; PASS |
| Exact release reproducibility | PASS; 77,163 bytes, SHA-256 `7972…270` |
| Bounded static security/performance checks | PASS; 11/11 checks |
| Chromium desktop keyboard, 1280×900 | 10/10; no JS errors, runtime requests, overflow or undersized controls |
| Chromium touch emulation, 390×844 | 10/10; no JS errors, runtime requests, overflow or undersized controls |
| Chromium touch + reduced motion, 360×640 | 10/10; no JS errors, runtime requests, overflow or undersized controls |
| Deliberate wrong-answer browser run | PASS; 0/4 graded, 0 points, one neutral setup excluded |
| Real-time adaptive browser run, 1366×768 | PASS; 79/79 graded correct, 87 screens, 100% accuracy |
| Real-time active-time budget | PASS; displayed 0.0 s remaining after 128.15 wall seconds |
| Local HTTP body identity | PASS; HTTP body 77,163 bytes with exact release SHA-256 |
| Local HTTP browser playthrough | PASS; 10/10, no JS errors or app runtime requests |
| In-place per-answer review | PASS |

The timed run lasts longer than 60 wall-clock seconds because the budget is 60 **active task seconds**. Feedback, input guards and pauses do not consume the budget. Screen and graded-question counts vary with the deterministic/randomized deck path; the invariant is that only settled graded questions count toward accuracy.

## Qualification hardening discovered during canonicalization

Two issues were found in the development/QA harness while the shipped game remained unchanged:

1. A real-time run could legitimately expire while a reaction round was waiting to reveal **GO**. The browser oracle incorrectly waited for the cue after the engine had already ended the run. The helper now accepts the documented terminal state before or immediately after the cue appears.
2. Live Chrome navigation can probe `/favicon.ico` independently of the application. The loopback development server now returns an empty 204 for that browser-chrome request, and browser QA classifies it separately from application runtime traffic.

Neither change touches `src/`, `site/` or the standalone release output. Rebuilding after both changes reproduced the original v0.2 artifact hash exactly.

## Coverage scope

The original v0.2 source receipt recorded **96.72% line coverage and 93.60% branch coverage** for the instrumented compiled engine, with 100% line coverage for the question generators and challenge parser in that run. Those coverage percentages were not rerun during this canonical qualification. UI and lifecycle behavior were exercised separately in Chrome.

## Important limits

The canonical qualification exercised the exact standalone HTML and a live loopback HTTP URL in Chrome 153. Browser emulation is not a physical-device test. Physical iPhone/Android, Safari and Firefox remain unqualified. System-level screen-reader behavior, voice output quality and fresh-player replay value are also unqualified.

The static audit is deliberately bounded and is not an independent penetration test or security certification. Scores remain local and unverified; no public deployment or secure global leaderboard is claimed. The clean npm install reported no known vulnerabilities in the two-package dependency tree at qualification time, but that is not a substitute for ongoing dependency review.

These are reproducible local evidence receipts, not a security certification or a “10/10 fun” score.
