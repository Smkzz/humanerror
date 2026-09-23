# Security model — HUMAN ERROR v0.4

## Scope and data

The game runs without an account, cookies, third-party scripts, analytics, advertising, payment flows or external AI. Offline and static-file play remain available. The optional shared leaderboard adds a small same-origin Node service; the production browser policy therefore permits `connect-src 'self'` rather than disabling networking.

The service stores up to 100 best results keyed by normalized display name and serves the top ten. A record contains only the display name, score, correct/attempted counts, best streak and server timestamp. IP addresses are used transiently for in-memory per-process rate limits and are not persisted or logged. The shared score file lives under `DATA_DIR`; protect, back up and retain that directory according to the playtest's data policy. There is no account recovery or verified ownership of a name.

## Client protections

- DOM content uses `textContent`, `createElement` and event listeners, not HTML-string injection, inline handlers or executable user content.
- The build hashes the exact inline script and style into CSP. It excludes `unsafe-inline` and `unsafe-eval`, restricts connections to the same origin, and denies objects, base changes and form submissions.
- Challenge seeds, display names, local preferences and profile storage are bounded and treated as untrusted. Local scores, exported receipts and cached shared entries are visibly distinguished; none of them authenticates a player.
- The portable page and Node API use an exact static-route allowlist. The server does not serve arbitrary files.
- `scripts/audit.mjs` checks selected CSP, payload, dependency and unsafe-sink invariants. This is a bounded static check, not a penetration test or security certification.

## Run verification and its limits

Each Adaptive start asks the server for a random, short-lived, one-use session bound to the current version, ruleset and seeded run. The browser sends bounded accepted input events, not a score. The server consumes the token, validates the transcript shape and order, enforces a minimum age derived from the referee's active, arming and feedback time, then recomputes the outcome and score by running the same compiled `Engine` module as the browser. Challenge and Practice have no ranked submission path. The old direct client-score endpoint returns 405.

This is **server-replayed casual competition**, not proof of human play or cheat-proof ranking. A player controls their browser and can edit the client, generate legal input events, automate the published game or claim another display name. The elapsed-time gate raises the cost of instant fabricated results; it does not stop automation that waits out the run. There is no CAPTCHA, verified identity, account, appeal process or adversarial bot defense. Use it for a monitored human playtest, not for money, prizes, high-stakes qualification or identity-sensitive standings.

Run sessions and rate buckets are in memory. Restarting the server invalidates unfinished sessions and clears rate-limit counters. One process is the supported initial deployment. File locks serialize score-file writes across processes sharing one local persistent directory, but a multi-instance service also needs sticky routing so issue and submit hit the same process; shared-file locking alone does not share session state. The current score retention is bounded to 100 display-name bests, with only the top ten exposed; a name outside the retained set can lose its older personal best.

## Service protections and deployment boundary

- Mutations require JSON and reject a conflicting `Origin` or `Sec-Fetch-Site: cross-site`. There is no wildcard CORS policy.
- Bodies and event lists are byte/count bounded. Version/ruleset and object keys are exact. Session IDs are single-use, random and process-local.
- Leaderboard writes use an exclusive lock, a bounded stale-lock recovery path, a unique temporary file, `fsync`, atomic rename and a bounded persisted file. Invalid files are quarantined rather than silently replaced.
- Fixed-window per-IP in-memory limits allow 120 leaderboard reads per 60 seconds, 12 session starts per 10 minutes, and 12 submissions per 10 minutes; expired or oldest entries are pruned before a rate-limited request when the map exceeds 10,000 keys; restart clears the buckets. Configure `TRUST_PROXY_HOPS` only when a trusted proxy overwrites/appends the forwarding chain correctly; the value must match the real proxy path.
- The service defaults to loopback and plain HTTP. A public playtest needs a TLS reverse proxy, a persistent writable `DATA_DIR`, deployment-specific firewall/logging/backup/restore monitoring, and a documented operator who can disable the endpoint. Do not expose the service directly to the internet without a separate operational review.
- Static host headers should include `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` and a restrictive Permissions Policy. The included headers file is a template, not a provider guarantee.

No secrets belong in the static page or score file. The server does not need a third-party API key.

## Dependencies and review

There are zero runtime packages. TypeScript **5.8.3** is the pinned development compiler; browser tests use development-only Python Playwright. `npm ci --ignore-scripts`, local tests and bounded audit are documented in the README. An online advisory-database audit was not run here. Keep compiler/browser tooling updates separate from the release artifact and inspect them deliberately.

No independent security review, public production deployment, physical-device review or formal accessibility certification is claimed by the current QA. Report suspected vulnerabilities privately to the project maintainer; do not publish personal data or exploit details in an issue by default.
