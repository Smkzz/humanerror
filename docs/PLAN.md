# HUMAN ERROR v0.2 — repair and polish plan

## Product contract
One screen. A short, sarcastic microgame rush. The opponent may be mischievous; the referee must not be. Ten correctly completed challenges must produce 10/10, irrespective of memory setup screens, cancelled final screens, repeated input, or visual effects. “10/10 fun” is a playtest target, not a claim that tests can establish.

## Audit of the MVP supplied in this conversation
The exact failed user session was not recorded. These are defects found in that source, not a claim to have reconstructed the user's 5/10 run.

1. `rounds++` occurs when a screen opens; `cleared++` excludes successful `silent` memory setup. The final `cleared / rounds` therefore counts ungraded screens and an unfinished last screen against the player.
2. A failed memory recall leaves `state.memory` populated. The scheduler presents the same failed recall repeatedly instead of consuming it once.
3. Answer handlers close over one question but `finishRound()` grades the global current question. No session/round token protects against stale events.
4. Input handlers do not validate their deadline; timeout and reaction readiness depend on the next animation frame. Input and visual timing can disagree.
5. The 60-second branch runs before the pending zero-lives branch. A fatal mistake near the end can receive a survival bonus.
6. The highest streak is stored after incrementing the next multiplier; the first success appears to be x2. “Best streak” is not the number of correct answers in succession.
7. The director uses raw error counts without opportunity counts. The “weakest” category can simply be the one presented most often.
8. Frames continue when idle and there is no tab-hide pause, disposal hook, or interruption recovery. Timers can advance without the player seeing the task.
9. A growing five-card HUD and stacked options can push controls off small screens. Native keyboard popups repeatedly consume the touch viewport.

## Release gates — decide before implementation
### Gate A: referee
A DOM-free typed engine; injected elapsed time; one terminal receipt per question; immutable question identity; explicit observed/cancelled/correct/wrong/timeout outcomes. Accuracy = correct / graded completed. A fully correct ten-question run is a regression test. Memory expires after one recall, successful or not. Last life takes priority over survival.
### Gate B: playable, fair chaos
Three readable opening tasks before escalation; one unambiguous answer per generated question; at least 44px controls; stable option layout; keyboard and touch; no compulsory OS keyboard. Short success feedback; a longer failure message shows the answer. Practice is untimed and separately labelled. Pause hides the challenge and never spends a life. Rules remain visible while answering.
### Gate C: open-source quality
Strict TypeScript; zero runtime dependencies; static hosting; no accounts, API keys, telemetry, advertisements, or generated code execution. Safe DOM construction, hash-based CSP, bounded challenge seeds and storage, documented casual-score trust model. MIT license; build, test and deployment documentation. Tests run locally; no paid CI or external services required.
### Gate D: evidence, not “ACTIVE”
Unit and generator tests, targeted original-bug regression fixtures, generated-seed runs, keyboard/touch browser playthroughs, small viewport/reduced-motion/storage-failure checks, CSP and request inspection, executable build and size check. Record limitations and browser versions. Never label a deployment tested merely because a host accepted it.

## Architecture
`random.ts` (seeded RNG) → `games.ts` (bounded question generators) → `director.ts` (local adaptive rules) → `engine.ts` (scoring and timing) → `app.ts` (DOM, input, effects). `challenge.ts` validates share links; `audio.ts` handles opt-in synthesized sounds. Native Node tests run against compiled ESM. TypeScript's own AMD output and a small fixed-module loader produce an offline standalone page; no hand-written import rewriting, eval, runtime CDN, or third-party bundler.

## Scope this iteration
Twelve scored microgame templates plus neutral memory setup, exact score receipts, one-screen review, three-stage pace, opt-in audio, reduced motion, personal best, same-deck challenges, and source package. Adaptive mode targets a smoothed failure rate with variety and recovery constraints; it is a rule-based game director, not an LLM or a psychological assessment. Challenge mode disables personalized scheduling so a seed means the same template/limits at the same ordinal. Scores remain casual, local and unverified.

## Deferred deliberately
Global leaderboard, multiplayer, achievements economy, accounts, cloud LLMs, automatic publishing to unrelated repositories, analytics, and claims about real human cognition. Human playtests remain necessary for humor, difficulty and replay value.

## Research informing implementation, not proof of game quality
- MDN requestAnimationFrame: refresh rates vary; background frames may pause. https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
- MDN Page Visibility: pause and resume on visibility changes. https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
- MDN performance.now: monotonic elapsed time. https://developer.mozilla.org/en-US/docs/Web/API/Performance/now
- W3C timing-adjustable: provide an untimed alternative. https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html
- OWASP DOM XSS: safe text sinks and DOM construction. https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html
- OWASP CSP: restrictive, hash-based script policy. https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html
