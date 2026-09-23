# HUMAN ERROR

**Fast hands. Questionable decisions.**

A one-screen microgame rush. Find the impostor. Save production. Remember the code. Do not press the extremely pressable button.

The director has a sense of humor. The referee does not.

![HUMAN ERROR opening screen](qa/desktop-keyboard-intro.png)

## Play

Open **`dist/index.html`** in a modern browser for offline play. No account, installation, API key or internet connection is required. When the page is served by the included Node server, Adaptive scores can enter the optional shared top ten after the server replays the run.

- **Adaptive:** 60 seconds of active play, four lives, and locally adapting task selection. A shared score appears only after a one-use server session and referee replay are accepted. If the service is unavailable, the run remains playable and is labelled local.
- **Challenge:** a fixed seeded deck with identical template parameters and limits at each ordinal. It is not ranked and is not directly comparable with Adaptive.
- **Practice:** ten graded tasks without answer deadlines or lives. It is not ranked. Memory setup and feedback advance separately; wait tasks still reward waiting.

Challenge links use ruleset **4**. Older ruleset links fail closed rather than silently representing a different deck. The 60-second budget measures active task time, not wall time. Feedback, the input guard and pauses do not consume it. Setup screens and an unfinished final question are excluded from the accuracy denominator.

### Controls

Click/tap an answer, or press **1–9** for the corresponding option. On spelling tasks, type letters, use **Backspace**, and press **Enter**, or use the on-screen keys. On reaction/wait tasks **Space** or **Enter** presses the displayed button; that is deliberately a mistake when the rule says not to press it. **P** pauses except while typing. Audio starts off and is optional.

The game pauses on tab hide, lost focus or a large scheduling interruption. Paused Adaptive runs do not update the shared board. Names are display labels: there are no accounts or identity checks, so someone else can use the same name.

## Local build and checks

Node.js 22 or newer is supported. TypeScript **5.8.3** is pinned as a development dependency; there are **zero runtime packages**.

```sh
npm ci --ignore-scripts
npm run check
npm run test:browser
python tests/failure_browser.py
python tests/timed_browser.py
npm run serve
```

`npm run check` rebuilds the artifact, runs the Node referee, generator, profile, replay, session, storage and HTTP tests, then checks CSP hashes, unsafe sinks, same-origin network use and the 110 KiB raw / 30 KiB gzip budgets. The portable page is produced from TypeScript AMD output by a fixed module loader. Build compaction is accepted only when the JavaScript syntax tree remains unchanged.

Python 3.10+ and Playwright are required for browser qualification; see `tests/requirements.txt`. Browser emulation is not a replacement for physical-device testing. The historical v0.3 receipt in [QA notes](docs/QA.md) is not qualification evidence for v0.4. Current v0.4 gates and limitations are tracked in [launch readiness](docs/LAUNCH_READINESS.md).

## Running the shared board

`npm run serve` serves the built page and API on loopback at `http://127.0.0.1:4173`. Its default `.runtime` data directory is for local work. For a hosted playtest, use Node.js 22+, a same-origin TLS reverse proxy, and a **persistent writable `DATA_DIR`**. The service itself speaks plain HTTP and defaults to loopback; expose it only behind the TLS proxy. Configure `HOST=0.0.0.0` and the actual proxy-hop count only in that deployment.

The first playtest deployment should run one server process. Run sessions and IP rate limits are in memory; a restarted process invalidates unfinished sessions. A shared data directory protects concurrent score-file writes, but a multi-process/load-balanced deployment also needs sticky routing from session issue through submission. Public leaderboard entries retain a bounded set of up to 100 display-name bests and expose only the top ten. Back up that data directory; malformed files are quarantined for operator review.

The API accepts only same-origin JSON, exact game version/ruleset fields, bounded transcripts and one-use sessions. It computes scores by replaying the same compiled referee used by the browser and refuses submissions that arrive before the simulated arming, action and feedback time could have elapsed. It ignores client-supplied scores. This makes the board defensible for a casual human playtest; it does **not** prove a human played, prevent a modified client from automating valid actions, verify identities, or provide account recovery. IP limits are process-local and transient; request addresses are not written to the score file. No analytics endpoint or third-party telemetry is included. Fixed-window per-IP limits are 120 board reads per 60 seconds, 12 session starts per 10 minutes, and 12 submissions per 10 minutes; buckets are process-local; expired or oldest entries are pruned before a rate-limited request when the map exceeds 10,000 keys, and restart clears them.

Set `TRUST_PROXY_HOPS` to the exact number of trusted proxy entries only when the front proxy overwrites/appends `X-Forwarded-For` correctly. An incorrect value weakens rate limiting. See [launch readiness](docs/LAUNCH_READINESS.md) and [security model](SECURITY.md) before exposing a playtest URL.

## Scoring

Each completed correct answer scores `(100 + speed bonus) × multiplier`. The speed bonus is 0–100, based on remaining task time; it is zero in practice and on tasks whose correct action is waiting. The multiplier is ×1 for streaks 1–3, ×2 for 4–6, ×3 for 7–9, and ×4 from 10 onward. A failed graded task resets the streak. Neutral setup does not change it. Surviving Adaptive adds 1,000 points once, only while at least one life remains.

Every counted answer has a receipt with the instruction, expected answer, submitted answer, task time, verdict and points. Result screens allow review or local JSON export. Exported receipts are not signed proof of play.

## Is this an AI model?

No cloud model runs during gameplay. The director is a small, transparent rule-based adaptive scheduler, not an inference API or psychological assessment. Deterministic answer checking is kept in the referee.

## Project structure

```text
src/              Referee, task generators, scheduler, profile and DOM client
scripts/          Reproducible build, replay verifier, run sessions, score store and HTTP server
tests/            Deterministic, storage, HTTP and browser coverage
dist/             Standalone page and exact size/hash manifest
docs/             Architecture, historical QA, playtest and launch-readiness notes
qa/               Receipts and screenshots; evidence, not certification
```

MIT licensed. See [SECURITY.md](SECURITY.md), [contribution guidance](CONTRIBUTING.md), and the [initial v0.2 plan](docs/PLAN.md).

## Not claimed

No guaranteed “10/10 fun” rating, human cognitive diagnosis, identity assurance, bot resistance, universal browser certification, independent security certification or tested public production deployment. Fresh-player testing and operator review remain required before a broader launch.
