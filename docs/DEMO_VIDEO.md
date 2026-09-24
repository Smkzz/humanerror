# HUMAN ERROR demo video

Target: **80–90 seconds**, 1080p60 if practical. Keep the video gameplay-first. Hackyard is community-voted, so the opening needs to make the game understandable before showing engineering proof.

## Final storyboard

| Time | Shot | On-screen message |
| --- | --- | --- |
| 0–5s | Cold open on an irresistible bait button; press it too early and show the failure receipt. | **You understood the instruction. Your hands disagreed.** |
| 5–10s | Title/lobby, enter a name, start Adaptive. | **HUMAN ERROR · ONE SCREEN** |
| 10–23s | Continuous fast play: one visual choice, one logic/math choice, one typing/input task. | **60 seconds · 4 lives · no repeated template** |
| 23–36s | Fast montage: shape impostor, reverse/word task, WAIT FOR GO, spatial/rotation task. | **132 deterministic mission templates · 5 categories** |
| 36–46s | Show a memory setup, several intervening tasks, then recall. | **Attention compounds. The deck adapts.** |
| 46–55s | Brief desktop → 360×640 mobile/touch cut, plus Challenge/Practice selector. | **Keyboard · touch · seeded Challenge · untimed Practice** |
| 55–68s | Finish an Adaptive run and hold on the result while the submission changes to accepted. Open leaderboard. | **Server replays ranked runs · client score is not trusted** |
| 68–78s | Very short engineering overlay: Inputs → deterministic referee → server replay → accepted score. Flash the QA receipts/repo. | **88 tests · 132/132 desktop · 132/132 mobile** |
| 78–85s | Show the standalone `dist/index.html`, then return to the bait mechanic and this time wait correctly. | **One screen. One file offline. MIT.** |

## Capture rules

- Use the current v0.7 artifact only: SHA-256 `b3e5934fadb5cd4a72396f309b399b0ca75b5252bcd55a87322e85037dcee1b5`.
- Capture real game UI from the final build; do not mock mission screens.
- Make cuts obvious. Do not imply an edited montage is one continuous run.
- Keep engineering/static shots under roughly 10 seconds total.
- Prefer large readable captions over dense narration.
- Avoid claims such as “AI-powered”, “cheat-proof”, “cognitive test”, “certified secure”, or “works on every browser/device”.
- Safe claims: 132 templates, five categories, 60-second Adaptive mode, four lives, seeded Challenge, Practice, deterministic referee, server-replayed ranked scores, 88/88 Node tests, exact 132/132 desktop and small-mobile browser sweeps, MIT, zero runtime npm dependencies.
- The final timed qualification achieved 82 unique active screens, 80/80 graded correct, score 53,452, Level 4 and 1.39× maximum tempo. Use these only if the video explicitly presents them as QA evidence rather than a normal human score.

## Upload

Hackyard accepts inline demo links from **YouTube, Vimeo, or Loom**. Publish the final video unlisted/public as appropriate, verify it plays while logged out, then paste the URL into the submission.

## Thumbnail / first frame

Use a current v0.7 gameplay frame with a readable trap prompt and the HUMAN ERROR identity visible. The screenshot is what voters see first on the submission card, so avoid a terminal or architecture diagram as the hero image.
