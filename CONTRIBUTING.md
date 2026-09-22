# Contributing

Keep the referee boring and the game entertaining.

1. Read `docs/PLAN.md` and the scoring contract in the README.
2. Run `npm ci --ignore-scripts`, then `npm run check`.
3. Add tests before changing grading, clock semantics, memory lifetime, or score receipts. The mandatory regression is ten correct graded answers → 10/10.
4. Use a seed and round ordinal for randomness. Every multiple-choice question must have exactly one valid answer. New vocabulary must avoid tied lengths and ambiguous synonyms.
5. Include keyboard and touch inputs without requiring timed users to open an OS keyboard. Do not rely on color or audio alone. Respect reduced motion and retain Practice mode.
6. Keep dynamic text out of HTML sinks, and keep the game independent of external services. No tracking or new runtime dependency without a documented decision.
7. Run browser tests at desktop and 360×640 / 390×844 viewports. Test wrong answers as well as perfect runs. Check the actual response MIME type before sharing a deployment.
8. Rebuild `dist/`, inspect the exact artifact, and refresh QA receipts. A changed artifact hash invalidates older exact-state claims until rerun or explicitly reconciled.

No auto-enabled CI is included. A future repository can add a manually triggered workflow after confirming runner/cost settings. Do not store credentials, tokens, production URLs with access tokens, or personal gameplay data in commits.
