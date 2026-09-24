# What “10/10” still needs from people

Automated evidence can establish referee correctness, deterministic challenge behavior, layout bounds and repeatable task contracts. It still cannot establish laughter, clarity for a first-time player, or an urge to play again.

## What v0.3 changes

v0.3 deliberately attacks the most obvious replayability bottleneck from v0.2 without adding a progression system:

- only the first three onboarding beats are fixed;
- seeded variation starts on screen four;
- five new graded microgames increase attention/interference variety;
- across 500 fixed challenge seeds, all 500 produced a different first-10 template sequence, compared with one fixed first-10 template sequence in v0.2;
- result/share copy gives the run a compact incident status, while still marking scores as local and mode-dependent.

That sequence-diversity result is evidence that the old structural repetition was removed. It is **not** evidence that 500 runs are fun.

## Next human playtest

The next useful product test is still 5–10 fresh players with no coaching. Let each person discover the game from the opening screen.

Watch for:

- the first confusing moment;
- whether they understand that physical position beats the printed word in the position task;
- whether exact-match and “do not pick” mistakes feel self-inflicted rather than unfair;
- whether memory setup is understood as ungraded;
- whether anyone searches or scrolls for a control;
- whether the incident-status result makes them want to retry or send a challenge;
- whether a shared Adaptive/Practice result is understood as non-comparable to the fixed-deck challenge.

Proposed product gates remain design targets rather than scientific thresholds:

- no correctly completed answer is rejected;
- first meaningful action within five seconds after starting;
- at least seven of ten players voluntarily choose another run;
- most players can explain the rule they broke after reading the one-sentence receipt;
- no supported viewport requires scrolling to find an answer;
- a first-time touch player can complete the opening sequence without opening a software keyboard or asking what to do.

Tune wording, task timing and joke density before adding accounts, achievements, economies or more systems. When generator order or limits change, bump the challenge ruleset; never silently make an old seed link represent a different test.

Surprise must come from attention pressure, interference and temptation—not hidden deadlines, post-input rule changes, probabilistic grading, or inaccessible information. The player should blame their haste, never the referee.

## v0.4 shared-board launch playtest

Run a monitored session with **5–10 first-time players**, including touch users. Tell them only that Adaptive is ranked after server replay, Challenge is a fixed shared seed but not ranked, and Practice is untimed. Do not coach them through the opening. Record consented observations and aggregate counts manually; v0.4 has no analytics event endpoint.

Add these checks to the v0.3 observations above:

- can the player tell a confirmed shared result from a pending, offline or rejected local result;
- do they understand that a display name is not an account and another person can reuse it;
- can they identify their shared top-three target and points gap without confusing a cached/local score for a live rank;
- does a Challenge share say that its fixed deck is not comparable with Adaptive;
- can they still start and finish a local game if the shared service is unavailable;
- does the leaderboard feel motivating without making mistaken identity or stale scores appear authoritative.

Do not turn these sessions into a fairness or anti-cheat certification. The service recomputes runs against the public referee and rate-limits session endpoints, but it cannot establish human input or name ownership. Analytics, accounts and stronger abuse controls stay deferred until fresh-player evidence shows that this playtest needs them.
