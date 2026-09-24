# Security policy and threat model — HUMAN ERROR v0.7

## Supported release

Security work currently targets **v0.7.x / ruleset 7**. Older pre-release rulesets are retained only as project history and should not be treated as supported deployment targets.

HUMAN ERROR is intentionally small: the game runs without accounts, cookies, third-party scripts, analytics, advertising, payment flows or external AI. Offline play requires no network at all. The optional shared leaderboard adds a same-origin Node service.

## Reporting a vulnerability

Please do **not** publish exploit details, secrets, personal data or leaderboard data in a public issue.

If GitHub private vulnerability reporting is enabled for this repository, use the repository's **Security → Report a vulnerability** flow. If that option is unavailable, open a minimal public issue asking the maintainer for a private security contact without including sensitive reproduction details.

A useful report includes:

- affected version/commit;
- affected route, file or trust boundary;
- minimal reproduction steps;
- expected versus observed behavior;
- realistic impact;
- any safe mitigation you already tested.

Security reports are evaluated against the documented threat model below. This is an open-source pre-1.0 game, so no formal response-time SLA is claimed.

## Data handled by the optional service

The shared score store retains at most 100 best results keyed by normalized display name. `GET /api/leaderboard` exposes only the public top ten. An accepted ranked submission can also return previous/personal-best score metadata for the submitted display name, including when that name is outside the current top ten; display-name ownership is not verified. A stored record contains:

- public display name;
- server-computed score;
- correct and attempted counts;
- best streak;
- server timestamp.

There are no player accounts and no verified ownership of a display name.

Client IP addresses are used transiently for process-local rate limiting. The application does not write those addresses to the leaderboard file. Reverse-proxy/platform access logs are outside the application's control and must be managed by the deployer.

The score file lives under `DATA_DIR`. The default development directory, `.runtime-v7/`, is ignored by Git. A public deployment must use an access-controlled, persistent, backed-up location.

## Browser protections

- Dynamic content is created with DOM nodes, `textContent` and event listeners rather than executable HTML strings.
- The release build hashes the exact inline script and stylesheet into Content Security Policy directives.
- CSP excludes `unsafe-inline` and `unsafe-eval`, limits network access to the same origin, and blocks objects, base changes and form submissions.
- Challenge seeds, display names, local preferences and cached profile data are bounded and treated as untrusted.
- Static routes are allowlisted; the Node service does not expose arbitrary filesystem paths.
- No runtime code evaluation, third-party script/style load, service worker or external gameplay dependency is required.
- `scripts/audit.mjs` verifies selected CSP, network, unsafe-sink, dependency, artifact-size and build-identity invariants. It is a bounded static audit, not a penetration test.

## Ranked-run verification

Only unassisted **Adaptive** runs have a ranked submission path.

1. The browser requests a random, short-lived, one-use run session bound to the exact game version, ruleset, seed and run identity.
2. The browser records bounded accepted input events. It does **not** submit an authoritative score.
3. The server prevalidates body size, exact envelope keys, version/ruleset, display name and event count before consuming the one-use session.
4. After consumption, transcript shape/order and minimum plausible wall time are validated.
5. The server replays the events through the same compiled `Engine` referee used by the browser.
6. The replayed result—not a client score field—is considered for leaderboard storage.

Challenge and Practice are unranked. The old direct score-submission path is not accepted.

### What replay does not prove

This is **server-replayed casual competition**, not proof of human play and not a cheat-proof ranking system.

A player controls their browser and can modify the public client, automate legal inputs, wait through the published timing contract or use another person's display name. There is no CAPTCHA, verified identity, account recovery, appeal system or adversarial bot defense.

Do not use this leaderboard for money, prizes, identity-sensitive decisions or other high-stakes ranking without a stronger trust model.

## HTTP and service protections

- Mutating routes require JSON and reject conflicting cross-site `Origin` / `Sec-Fetch-Site` signals. There is no wildcard CORS policy.
- Request bodies are capped at **64 KiB**. Declared oversize bodies fail before parsing; streaming/chunked bodies are rejected as soon as the cap is crossed, the request stream is paused and the response closes the connection.
- Event lists, object keys, names, versions and rulesets are bounded and exact.
- Run-session identifiers are cryptographically shaped, short-lived, random and one-use.
- Fixed-window process-local limits allow 120 leaderboard reads per 60 seconds, 30 session starts per 10 minutes and 30 submissions per 10 minutes per resolved client address.
- The rate-limit map is bounded to 10,000 keys. Normal lookup/update is O(1); capacity cleanup is bounded by the map size.
- `TRUST_PROXY_HOPS` is opt-in and must equal the real trusted proxy chain length. A wrong value weakens address-based rate limiting.
- `/api/health` is deliberately lightweight and does not acquire the leaderboard lock or imply storage readiness.
- The server has request/header/keep-alive timeout bounds and the body-limit path does not wait for EOF once the byte cap is crossed.

## Persistence protections

Leaderboard writes use:

- an exclusive lock;
- bounded stale-lock recovery;
- a unique temporary file;
- `fsync`;
- atomic replacement;
- a bounded exact-schema JSON document.

Malformed JSON or a semantically invalid row quarantines the complete persisted file while preserving its bytes for operator review; the active board then fails closed to an empty state.

The file lock coordinates writers that share one local data directory. It does **not** share in-memory run sessions or rate-limit state. The supported initial deployment is one application process. Scaling out requires session affinity and an explicit shared-state design.

## Build and supply-chain boundary

The release has **zero runtime npm packages**.

Development tooling is lockfile-pinned:

- TypeScript **5.8.3**
- Bun **1.4.0**

The build invokes those local executables directly and fails if they are missing; it does not silently fall back to globally installed compilers/bundlers. `npm ci` is the documented clean-install path; `.npmrc` enables npm's strict script policy and `package.json` explicitly allowlists only the pinned Bun `1.4.0` installer.

Before the service listens, the provenance guard verifies:

- game version and ruleset against the compiled server;
- `dist/index.html` byte count and SHA-256;
- deterministic identity and file count of the complete compiled server-module set.

The build clears stale compiled modules before producing that identity. This is a consistency boundary, not publisher authentication: an attacker who can replace the source, manifest and all artifacts together is outside this control.

The current v0.7 release artifact is:

- **103,057 raw bytes**
- **38,360 gzip bytes** (level 9)
- SHA-256 `b3e5934fadb5cd4a72396f309b399b0ca75b5252bcd55a87322e85037dcee1b5`
- **0 runtime dependencies**

The exact release test and browser evidence is documented in [docs/QA.md](docs/QA.md).

## Deployment boundary

The included service defaults to loopback and plain HTTP. For an internet-facing playtest:

1. run the exact release checks before deployment;
2. terminate TLS at a same-origin reverse proxy;
3. use a persistent writable `DATA_DIR`;
4. expose `HOST=0.0.0.0` only behind that proxy;
5. configure `TRUST_PROXY_HOPS` only when the forwarding chain is controlled;
6. start with one application process;
7. monitor, back up and test restoration of the leaderboard store;
8. keep an operator path for disabling the service.

Static hosting should preserve the included security headers, especially CSP / `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` and the restrictive Permissions Policy.

## Security claims deliberately not made

The v0.7 qualification is not an independent penetration test, formal security certification, identity system, bot-resistant competition platform, production-scale operations certification, physical-device security review or universal-browser guarantee.

The project prefers explicit limits over security theater: replay verifies consistency with the public deterministic rules, not who or what produced the valid actions.
