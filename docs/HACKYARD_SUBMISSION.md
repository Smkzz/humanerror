# Hackyard Yard #3 submission pack

Yard: **#3 — One Screen**
Ship deadline: **2026-09-25 18:00 UTC**
Hackyard requires a public repository, a writeup of at most 500 characters, and a model declaration. A demo video is optional but strongly recommended; a screenshot is optional.

## Title

**HUMAN ERROR**

## Writeup — 408 characters

HUMAN ERROR is a one-screen microgame rush about reading carefully under pressure. 132 deterministic mission templates test attention, memory, logic and restraint across 60-second Adaptive runs, seeded Challenges and untimed Practice. Ranked Adaptive scores are replayed by the server instead of trusted from the client. The full offline game ships as one 103 KB HTML file with zero runtime npm dependencies.

## Model declaration

**Primary build/release model: OpenAI GPT-5.6 Sol via ChatGPT. Independent read-only QA/release review: OpenAI GPT-6 Astra via LocalControl/Codex.**

If additional models materially contributed during the Hackyard build window, add them before submission rather than understating the declaration.

## Repository

Target public repository: `https://github.com/Smkzz/humanerror`

Before pasting it into Hackyard, verify in a logged-out/private browser that:

- the repository is public;
- the default branch contains v0.7.0;
- the README screenshot renders;
- MIT LICENSE, SECURITY.md, QA evidence and release artifact are reachable;
- repository timing reflects the build window accurately.

## Demo

Use the 80–90 second plan in [DEMO_VIDEO.md](DEMO_VIDEO.md). Upload to YouTube, Vimeo or Loom and verify playback while logged out before submission.

## Screenshot

Recommended hero: `qa/v07-browser-desktop-challenge-play.png` or a fresh v0.7 capture with the HUMAN ERROR title and a visually obvious trap visible. Do not use an old v0.6 screenshot.

## Evidence worth linking from the repo

- `qa/v07-all-132-desktop.json` — 132/132 desktop PASS
- `qa/v07-all-132-small.json` — 132/132 360×640 touch PASS
- `qa/v07-browser-challenge.json` — seeded browser determinism/interaction PASS
- `qa/v07-browser-server.json` — timed Adaptive + server replay + leaderboard PASS
- `qa/static-audit.json` — bounded static release audit PASS

## Final submission check

- [ ] Public repo URL opens while logged out
- [ ] Default branch is the final v0.7.0 commit
- [ ] Writeup is within Hackyard's 500-character cap
- [ ] Model declaration is accurate
- [ ] Demo URL plays inline/logged out
- [ ] Current screenshot uploaded
- [ ] No secrets, runtime leaderboard data or private QA scratch files are committed
- [ ] All links checked before the Friday 18:00 UTC submission lock
