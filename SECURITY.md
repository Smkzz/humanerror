# Security model

## What is in scope

HUMAN ERROR is a static, account-free game. It has no server-side authority, external AI model, payment flow, login, database, secrets or telemetry. Runtime networking is blocked by the page's CSP. The only persistence is an optional bounded local preferences/high-score object.

The public seed is validated before use: version, mode and seed are allowlisted; duplicate keys, overlong values and unexpected keys are rejected. Seeds are not secrets. Share URLs do not contain the player's answers or a claimed trusted score. Typed input is bounded and treated only as text.

## Implementation protections

- DOM content uses `textContent`, `createElement` and event listeners, not HTML-string injection, inline handlers or executable user content.
- The build emits exact SHA-256 hashes for its script and stylesheet in CSP. It does not need `unsafe-inline` or `unsafe-eval`. `connect-src 'none'`, `object-src 'none'`, `base-uri 'none'` and `form-action 'none'` restrict unnecessary capabilities.
- Host headers should additionally include `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and a restrictive Permissions Policy. `frame-ancestors` must be a response header, not a meta tag. See `dist/_headers` as a provider-specific template, not a universal server config.
- A session-and-round ID binds every answer to its rendered question. Results settle once. Duplicate, stale, unknown and overlong answer submissions cannot grade a different question through the normal API.
- Runtime requests, unsafe APIs, CSP integrity and payload budgets are checked by `scripts/audit.mjs`. This is a bounded check set, not a substitute for independent review.
- The small development server binds to loopback, handles GET/HEAD only, uses an exact route allowlist, and does not serve arbitrary files. Never expose it as a production server without deployment-specific review.

## Explicit trust boundary

The browser and its JavaScript are controlled by the player. An open-source, client-only game cannot stop someone editing memory, storage, timers or scores in developer tools. Local best scores and exported receipts are convenience records, **not cryptographic proof of play**. A seed makes a deck reproducible; it does not authenticate a score.

A real competitive leaderboard would require a separately designed server-side verifier, versioned replay protocol, abuse controls and operational safeguards. None is silently implied here. No secrets should ever be added to the static page.

## Dependencies and release process

There are zero runtime packages. The only npm development dependency is the pinned TypeScript compiler, with the published package integrity in `package-lock.json`. Browser tests use development-only Python Playwright. No GitHub Actions workflow is enabled by this package. Build and QA can run locally without CI credits.

The build and source were tested with the available pinned compiler. A fresh online `npm ci` / advisory-database audit was not run in the current network-restricted environment. Review dependency updates deliberately; do not take “zero runtime dependencies” as a guarantee that all development tooling is vulnerability-free.

## Reporting

A dedicated public repository and private vulnerability-reporting channel have not yet been configured. Do not publish exploit details or private user data in a public issue by default. Contact the maintainer privately once the repository/contact is established.
