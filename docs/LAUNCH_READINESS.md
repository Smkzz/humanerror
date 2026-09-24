# HUMAN ERROR v0.7 release readiness

Qualification date: **2026-09-24**

## Release decision

**v0.7.0 / ruleset 7 is qualified as the Hackyard open-source release candidate.**

The earlier artifact-size blocker is resolved without weakening the existing gate. The exact standalone release is **103,057 raw / 38,360 level-9 gzip bytes**, below the strict **126,976 raw / 39,936 gzip** ceilings.

The game code is ready to publish for the competition subject to the repository/submission steps at the end of this document. This is an OSS game-release decision, not a claim that the optional leaderboard service has been independently certified for high-stakes production use.

## Exact release identity

- Version: **0.7.0**
- Ruleset: **7**
- Mission templates: **132**
- Portable artifact: `dist/index.html`
- SHA-256: `b3e5934fadb5cd4a72396f309b399b0ca75b5252bcd55a87322e85037dcee1b5`
- Size: **103,057 raw / 38,360 gzip bytes**
- Server modules: **12**
- Server-module set SHA-256: `a8829c8eb2caf35288a8ba37713d17ac5e5c339d8e6d81a0c28f3b90329f2412`
- Runtime npm dependencies: **0**
- Build tools: TypeScript **5.8.3**, Bun **1.4.0**, lockfile-pinned

## Automated release gates

Current `npm run check`: **PASS**.

- **88/88** Node tests pass.
- **132 × 1,000** generator cases pass contract checks.
- **50 × 1,000** new-v0.7 visible-answer oracle cases pass.
- **264,000** generated-choice instances contain no blank/undefined answer label.
- Static security/release audit: **PASS**.
- Exact artifact byte count, gzip count and SHA-256 agree with the manifest.
- Oversized streaming HTTP bodies are rejected before EOF with a closed connection.
- Secret-signature scan found no high-confidence publishable-file matches.
- Local leaderboard/runtime data is excluded from Git.
- Publishable UTF-8 text is LF-normalized and the committed checksum/browser-evidence set is verified by `npm run verify:evidence`.

## Browser qualification

### Desktop

- viewport: **1280×900**
- input: keyboard
- **132/132** mission templates settled correctly
- **131/131** graded missions correct + **1** neutral memory setup
- deck finished with final result **131/131**
- no repeats
- Level 4 reached
- **0 JavaScript errors**

Receipt: `qa/v07-all-132-desktop.json`.

### Small mobile

- viewport: **360×640**
- input: touch
- **132/132** mission templates settled correctly
- **131/131** graded missions correct + **1** neutral memory setup
- deck finished with final result **131/131**
- no repeats
- Level 4 reached
- no qualification overflow/target-size failures
- **0 JavaScript errors**

Receipt: `qa/v07-all-132-small.json`.

These are browser-emulated viewport tests rather than physical-device certification.

### Timed Adaptive / shared-score path

The timed browser/server receipt records:

- **60,000 ms active play**
- **80/80** graded answers correct
- **53,452** browser score
- exact browser/server score parity
- Level 4 / **1.39×** maximum tempo
- replay result **server-replayed**
- leaderboard submission accepted
- **0 JavaScript errors**

Receipt: `qa/v07-browser-server.json`.

## Mission-quality status

The mission review found no reason to remove any of the 132 templates. The release includes the v0.7 fairness/content corrections documented in the changelog and mission catalogue.

Question-signature diversity over 100 seeds per template:

- minimum: **4**
- median: **100**
- mean: **93.41**
- maximum: **100**

Only `reaction`, `override` and `suppressrepeat` fall below 30 because their intended visible response spaces are explicitly finite; each hits its **4/4** target.

Remaining mission questions such as dialect-sensitive English semantics and perceived fairness at the highest tempo are human-playtest questions, not correctness blockers.

## Security posture

The release has no High/Critical finding from the final static review.

Release hardening includes:

- zero runtime npm dependencies;
- pinned local compiler/bundler invocation without shell fallback;
- hash-based CSP;
- safe DOM construction;
- same-origin API boundary;
- bounded request bodies/transcripts;
- immediate oversize streaming rejection;
- one-use version/ruleset-bound run sessions;
- server-side deterministic score replay;
- request-rate bounds;
- bounded atomic persistence with corruption quarantine;
- startup build-provenance verification;
- ignored runtime/player-data directories.

The complete trust model and explicit non-claims are in [SECURITY.md](../SECURITY.md).

## Deployment conditions for the optional shared board

Offline `dist/index.html` is the lowest-risk release path and requires no server.

For the shared board:

1. run `npm run check` on the exact source to be deployed;
2. run the Node service behind a same-origin TLS reverse proxy;
3. use a persistent writable and backed-up `DATA_DIR`;
4. set `HOST=0.0.0.0` only behind that proxy;
5. configure `TRUST_PROXY_HOPS` only for a controlled proxy chain;
6. start with one application process because sessions/rate limits are process-local;
7. keep an operator rollback/disable procedure.

The leaderboard is appropriate for casual public playtesting, not money/prizes or identity-sensitive ranking.

## Known limitations that are not release blockers

- no physical iOS/Android qualification;
- no Safari/Firefox qualification;
- no full assistive-technology/WCAG certification;
- no independent penetration test;
- no strong bot resistance or verified player identity;
- no proof of large-scale production operations;
- subjective fun/comprehension/replay desire still require human playtesting.

These limitations are stated publicly rather than hidden behind a generic “production ready” label.

## Competition release checklist

Code/artifact qualification is complete. Before the Hackyard submission is considered shipped:

- [ ] publish the repository as **public/open source**;
- [ ] put this exact v0.7 release on the default branch;
- [ ] verify the public README, license, security policy and QA links;
- [ ] publish the competition demo video and attach its URL;
- [ ] use a current screenshot from v0.7;
- [ ] submit the repository URL, demo URL, concise write-up and model declaration;
- [ ] verify all submission links in a logged-out/private browser window.

The video plan is in [DEMO_VIDEO.md](DEMO_VIDEO.md). Exact test evidence is in [QA.md](QA.md).
