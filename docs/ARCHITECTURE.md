# Architecture and decisions

## Authority flow

Question generation → referee → receipt → presentation. The view never declares an answer correct, increments points, or edits the denominator. It sends a literal answer and the ID of the question that supplied its control. The engine records the verdict before the view renders feedback.

`ready → arming → active → feedback → arming … → finished`

Pause is an orthogonal flag. An arming guard prevents the input that ended an earlier screen from immediately answering the next. The game can settle at most one visible task in a clock step; a suspended browser never resolves a queue of unseen tasks.

## Timing

The host integrates monotonic `performance.now()` deltas, not frame counts. Active time advances only in the active phase; feedback and the short arming guard are outside the budget. Frame rendering never decides correctness. A deadline is inclusive; advancing beyond it settles a timeout before a later input can reverse that verdict.

The reaction generator has a cue delay, but elapsed time alone is insufficient: the presentation layer must acknowledge placing GO in the displayed DOM. An input that still sees WAIT is an early input. Native input handlers synchronize the clock before submitting and do not manufacture a GO presentation first.

Tab hide, focus loss, and scheduling gaps above 350ms pause the run. Practice reading/answering has no deadline and no life elimination. Wait tasks still auto-resolve successful waiting. A pause is labelled; it is not presented as an unassisted best.

## Score accounting

Receipts are `correct`, `wrong`, `timeout`, `observed` or `cancelled`. Only the first three form the accuracy denominator. The ledger is append-only through the engine API and its receipt objects are frozen. Duplicate/stale answers do not create receipts. A failed memory recall consumes the saved memory exactly as a successful recall does.

`completed = correct + wrong + timeout`

`accuracy = correct / completed`, or no percentage before any graded task.

`score = sum(receipt.scoreDelta) + earned survival bonus`

The fourth life loss takes priority over a coincident time limit. The terminal-state guard prevents multiple survival bonuses. A perfect short practice run does not pretend to have survived the timed mode.

## Director and replay fairness

The director is local game AI in the conventional rule-based sense, not an inference API. After the opening sequence, adaptive scheduling weights category difficulty using `(failures + 1) / (attempts + 3)` and enforces variety and recovery constraints. It does not label someone weak from a single mistake or infer any psychological trait.

Fixed-deck challenges use a seed and question ordinal without personalized success history. Every generator's parameters and limit are derived from that identity. Challenge scores remain unranked and should not be compared with Adaptive. Adaptive submissions are replayed by the server against the same compiled referee before entering the shared board; replay confirms consistency with the public game rules, not that a human supplied the actions.

## Static build

The source is ordinary strictly checked TypeScript modules. The compiler emits ESM for Node tests and named AMD factories for the standalone release. A fixed, small module registry executes those compiled factories; it does not interpret user strings or fetch modules. A token-based build compactor preserves the parsed JavaScript syntax tree and emits the standalone script. The generated page contains one stylesheet and one script, both pinned by exact CSP hashes.

The page has no font files, image dependencies, downloaded audio, framework, service worker, or third-party calls. It can still run as a local offline file. When served by the optional Node application, three same-origin API calls read the shared board, issue a one-use Adaptive session and submit a bounded transcript. The CSP permits only same-origin connections. The server replays that transcript through the compiled `Engine` and writes server-computed results to a bounded persistent score file. Audio is synthesized after an explicit user gesture. Dynamic content is built as DOM nodes and text. The only per-frame work during a run is clock integration and lightweight view updates; the instruction/answer DOM is replaced only on a state change. HUD updates are throttled. The animation loop stops when idle, finished, hidden, paused or waiting indefinitely in practice.

## Shared-score path

`GET /api/leaderboard` returns the current top ten. `POST /api/run-sessions` issues a random session ID and seed tied to the current version/ruleset. `POST /api/run-sessions/:id/submit` consumes the session once, validates the exact request shape, name and ordered round actions, then replays it. Client score claims are not accepted. Minimum submission age includes active referee time, round arming and feedback; this discourages an instant synthetic survival transcript but does not prevent a modified client from waiting and automating legal actions.

The data store keeps up to 100 best results by normalized display name and exposes ten. It timestamps on the server, serializes writers with a file lock, fsyncs a unique temporary file and atomically replaces the bounded JSON store. Run sessions and rate counters are process-local. A single service process with persistent local `DATA_DIR` is the supported starting point; scaling out needs session affinity as well as shared score storage. File play or service failure remains playable but produces only local, unverified results.

## Deliberate limitations

One English content set, one tested browser engine, touch emulation rather than physical devices, display names without identity checks, and no external AI calls. The optional shared board has no bot resistance, account recovery, multi-region consistency or production operations guarantee. Short/small viewports and assistive-technology support need continued testing; no full WCAG compliance claim is made. The game is prepared for a monitored human launch playtest, not declared production-secure or universally entertaining.
