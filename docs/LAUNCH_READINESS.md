# HUMAN ERROR v0.4 launch-playtest readiness

## Candidate identity and preservation

- Repository: `C:\Projects\Human-Error-v04-dev`
- Branch: `feature/v0.4-personal-leaderboard-variety`
- Starting commit: `720e770d28a8000cbe7a272e38c5d77c503b1809`
- Game version/ruleset: `0.4.0` / `4`
- This is a local, uncommitted candidate. No merge, push, publication, DNS change or deployment is included.
- Before editing, the initially dirty working tree and index patches, original untracked v0.4 files, built artifact, QA reports and screenshots were preserved at a task-local backup under the system temp directory. Existing v0.3 qualification is retained separately in `docs/QA.md` and was not reused as v0.4 evidence.

## What the candidate provides

Adaptive remains playable offline and on static hosting. A local browser keeps local scores separate from any server result. When same-origin service calls work, Adaptive asks for a short-lived one-use session bound to the version/ruleset, seed and run ID. The browser submits ordered accepted input events and renderer presentation receipts; it never submits an authoritative score. The server replays the events through the exact compiled referee, enforces that the minimum simulated run/arming/feedback time could have elapsed, timestamps the result, and only then updates the shared board.

Challenge and Practice are explicitly unranked. Shared ranks and score gaps are not shown while acceptance is pending. Offline, rejected, local, cached and live shared results use separate labels. The old preference/high-score migration remains local and is not backfilled into the shared board. Display names are public labels, not identities.

The score store keeps up to 100 display-name bests and serves the top ten. It uses a same-host exclusive file lock, bounded JSON, unique temporary files, file sync and atomic replacement. Corrupt input is quarantined. Run sessions and IP rate limits are process-local.

The service allows 120 leaderboard reads per IP in each 60-second window, 12 run-session starts per IP in each 10-minute window, and 12 submissions per IP in each 10-minute window. Fixed-window buckets are held only in process memory. Each rate-limited API request prunes expired entries and evicts oldest entries while the map has more than 10,000 keys; adding a new key can leave it at 10,001 until the next rate-limited request. Restart clears all buckets. The socket peer address is used by default. TRUST_PROXY_HOPS enables forwarded-address selection only behind a proxy that controls X-Forwarded-For and only when set to the exact trusted hop count. The application does not persist or log client IPs.

The shared score file contains only the public display name, recomputed score, correct and attempted counts, best streak, and server-assigned recordedAt timestamp. Receipts are not written to persistent score storage. The default development DATA_DIR is the repository's .runtime directory; a hosted playtest must set DATA_DIR to a persistent, writable, access-controlled and backed-up volume.

The browser stores sound and legacy best preferences plus the v4 localStorage profile: display name, browser-local bests, a cached shared top ten, last-known rank and time, and games played. There are no accounts, cookies, persistent cross-site IDs, analytics endpoint, or third-party trackers in this candidate. Reverse-proxy access logs remain deployment-controlled.

## Deployment conditions for a human playtest

1. Build and validate this exact candidate before starting the service.
2. Place the plain-HTTP Node service behind a same-origin TLS reverse proxy. Do not expose the loopback development default directly.
3. Set `DATA_DIR` to a persistent, writable, backed-up volume. Set `HOST=0.0.0.0` only behind that proxy and set `TRUST_PROXY_HOPS` to the exact trusted chain length only if the proxy safely writes `X-Forwarded-For`.
4. Start one service process for the initial playtest. If routing among processes, keep session issue and submit on the same process; the file lock coordinates the score file but does not share sessions or rate buckets.
5. Check `/api/health`, make one consented test run, confirm `SHARED RESULT ACCEPTED`, then inspect `/api/leaderboard` and the persisted score file. Back up or remove only the designated playtest data at closeout.
6. Have an operator able to disable the service and restore its previous score file. Names can be impersonated, and the board is casual competition.

The server does not provide TLS termination, durable session sharing, identity, CAPTCHA, strong bot resistance, analytics, accounts, monitoring, automatic backups or multi-region consistency. The time gate rejects immediate fabricated survival requests; it cannot prove that a human played, because a modified client can wait and automate the public referee. Do not use the board for money, prizes or identity-sensitive decisions.

## Human validation that remains external

Automated checks cannot establish humor, comprehension, replay desire or real-device usability. Run the 5–10 first-time-player protocol in [PLAYTEST.md](PLAYTEST.md), including the distinction between confirmed shared scores, local fallback, cached scores and unranked fixed challenges. Record consented observations manually; no analytics event endpoint is part of v0.4.

## Qualification record

Qualification date: **2026-09-23**. Exact candidate: `720e770d28a8000cbe7a272e38c5d77c503b1809` on `feature/v0.4-personal-leaderboard-variety`, with the preserved pre-existing dirty v0.4 work plus the changes listed in this repository. No commit, merge, push, publication, DNS change or deployment was performed.

### Built artifact

- File: `dist/index.html`
- Version/ruleset: `0.4.0` / `4`
- Size: **94,846 bytes raw / 28,052 bytes gzip** (within the 110 KiB / 30 KiB limits)
- SHA-256: `736a24a892153e8df391a7429571a2adc8e3b51227c4b1ede5ed5a58b45ec9a5`
- Runtime dependencies: **0**
- Two consecutive builds emitted identical bytes and manifest hashes. `npm run typecheck` passed.

### Automated and browser evidence

- `npm run check`: **61/61 Node tests passed**, no skips or failures; the bounded static audit passed all 12 checks, including exact CSP hashes, same-origin-only networking, no unsafe-inline/eval, no HTML string sinks, no third-party loads and artifact size/hash.
- `npm run test:browser`: **PASS** in Chromium `154.0.8037.57`. Exact-artifact desktop keyboard (`1280×900`), mobile touch (`390×844`) and reduced-motion small mobile (`360×640`) all completed Practice at 10/10 with no horizontal/vertical page overflow, undersized controls, JavaScript errors or runtime requests. v0.3 keyboard/touch fixtures and v0.4 keyboard/touch coverage also passed; v0.4 coverage visited 17 screens per input method.
- Browser migration fixture: the `human-error:v3` best migrated into the browser-local v4 profile; an existing `human-error:leaderboard:v4` profile restored its name, score and games played. Neither local result was copied to the shared board.
- `python tests/failure_browser.py`: **PASS**, 0/4 after four graded mistakes and one ungraded setup, no JavaScript errors and no overflow at `1366×768`.
- Final live-server Adaptive run: **169 screens; 156/156 graded correct; 100%; 193.2 seconds wall time; zero JavaScript errors**. The same-origin API returned board `200`, session `201`, submission `200`; the server accepted and replayed the receipt, assigned `116,810`, returned shared rank `#1`, and persisted one record. At the result screen `1366×768`, document size was exactly `1366×768` with no undersized controls. Receipt and screenshot: `qa/timed-adaptive.json`, `qa/timed-adaptive-result.png`.
- After stopping and restarting that service from its persistent test `DATA_DIR`, `tests/shared_board_browser.py` opened a new browser context with no initial profile. It fetched the board (`200`), displayed the other run’s exact `116,810` score, then cached the server result. No external requests or browser errors; `390×844` had no overflow. Receipt: `qa/shared-browser-read.json`.
- The store/server tests cover empty/first/top-ten boards, one best per normalized name and a returning player outside the visible top ten, concurrent writes from separate server processes, corrupt-file quarantine, one-use/expired sessions, too-early runs, forged/malformed/oversized submissions, invalid names and origin, restart persistence, rate limits, and rejection of Challenge, Practice and assisted declarations/submissions.
- `git -c core.whitespace=cr-at-eol diff --check` passed, and a separate scan found no literal trailing spaces or tabs in changed/new text files. The preserved initial dirty patch already contained CRLF-added lines; plain `git diff --check` without `cr-at-eol` flags those carriage returns as trailing whitespace, so line endings were not broadly rewritten.

Detailed reports and screenshots are under `qa/`; this record and the new v0.4 section in `docs/QA.md` are additive to the historical v0.3 qualification.

### Remaining gates and decision

**Ready for a controlled 5–10 player human launch playtest once hosted behind the deployment conditions above.** The local service run proves the candidate can support that playtest; it is not a deployment or evidence that the human playtest has happened.

Do not describe this as a public production launch, anti-cheat certification, or identity-secure competition. Display names can be impersonated; a player can automate the public client/referee and wait out the minimum-time gate. The service has no account system, CAPTCHA, strong bot resistance, analytics, monitoring or automatic backups. Run sessions and rate buckets are process-local, so the documented initial host should use one service process. The score file retains up to 100 display-name bests and serves the top ten.

Still needed before a public launch decision: provision a same-origin TLS reverse proxy and persistent backed-up `DATA_DIR`; perform operator health/restore rehearsal; run the documented first-time-player protocol; test physical iOS/Android devices plus Safari/Firefox and screen-reader access; and decide whether the casual anonymous board’s abuse limits are acceptable. These human, platform and operational checks are not established by local automated tests. Analytics are intentionally deferred. Public deployment/publication remains outside the authorization for this task.
