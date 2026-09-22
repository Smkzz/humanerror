import { AudioCues } from './audio.js';
import { challengeLink, parseChallenge, Preferences, readPreferences } from './challenge.js';
import { Engine, RULESET } from './engine.js';
import { Mode, Receipt, Round } from './types.js';

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag); node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function button(text: string, action: () => void, className = 'button'): HTMLButtonElement {
  const node = element('button', className, text); node.type = 'button'; node.addEventListener('click', action); return node;
}
function required<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id); if (!node) throw new Error(`Missing required element: ${id}`); return node as T;
}
const PRESET = parseChallenge(location.hash);
const prefs: Preferences = (() => { try { return readPreferences(localStorage.getItem('human-error:v2')); } catch { return readPreferences(null); } })();
const audio = new AudioCues(); audio.enabled = prefs.sound;
const root = required('app'), board = required('board'), stage = required('stage'), modeLabel = required('mode-label');
const clockEl = required('clock'), scoreEl = required('score'), correctEl = required('correct'), livesEl = required('lives');
const prompt = required('prompt'), hint = required('hint'), actions = required('actions'), narrator = required('narrator');
const roundProgress = required<HTMLProgressElement>('round-progress'), totalProgress = required<HTMLProgressElement>('total-progress');
const roundCaption = required('round-caption'), streakEl = required('streak'), announcer = required('announcer');
const soundButton = required<HTMLButtonElement>('sound'), pauseButton = required<HTMLButtonElement>('pause');
const footerText = required('footer-text');
const abort = new AbortController();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let mode: Mode = PRESET?.valid ? 'challenge' : 'adaptive';
let fixedSeed: string | null = PRESET?.valid ? PRESET.seed : null;
let engine: Engine | null = null, runNumber = 0, raf: number | null = null, lastFrame = 0, hudAt = 0;
let viewKey = '', lastReceiptId = '', lastEndId = '', inputValue = '', inputToken = '';
let reviewIndex: number | null = null;
let resultNote = '';
let disposed = false;

function savePrefs(): void { try { localStorage.setItem('human-error:v2', JSON.stringify(prefs)); } catch { /* Optional persistence must never block play. */ } }
function seed(): string {
  const bytes = new Uint32Array(2); crypto.getRandomValues(bytes);
  return `${bytes[0]!.toString(36)}-${bytes[1]!.toString(36)}`;
}
function labelMode(m: Mode): string { return m === 'adaptive' ? 'ADAPTIVE' : m === 'challenge' ? 'SAME-DECK CHALLENGE' : 'UNTIMED PRACTICE'; }
function clearScene(tag: string, title: string, subtitle: string): void {
  stage.textContent = tag; prompt.textContent = title; hint.textContent = subtitle;
  board.replaceChildren(); actions.replaceChildren();
  board.className = 'board'; board.dataset['kind'] = '';
  root.dataset['view'] = tag;
  announcer.textContent = `${title} ${subtitle}`;
}
function intro(): void {
  stopLoop(); engine = null; reviewIndex = null; viewKey = ''; resultNote = '';
  pauseButton.hidden = true; root.dataset['tone'] = 'neutral'; root.dataset['phase'] = 'intro';
  modeLabel.textContent = labelMode(mode);
  clearScene('ONE SCREEN. ZERO EXCUSES.', 'DO WHAT\nI SAY.', 'A new ridiculous task every few seconds. Four mistakes and the machine wins.');
  const hero = element('div', 'intro-copy');
  hero.append(element('span', 'bracket', '[ HUMAN ERROR / v0.2 ]'), element('p', '', 'Fast hands. Questionable decisions.'));
  board.append(hero);
  const modes = element('div', 'mode-picker'); modes.setAttribute('role', 'group'); modes.setAttribute('aria-label', 'Game mode');
  for (const [value, text] of [['adaptive', 'Adaptive'], ['challenge', 'Challenge'], ['practice', 'Practice']] as const) {
    const b = button(text, () => { mode = value; intro(); }, `mode-button${mode === value ? ' selected' : ''}`);
    b.setAttribute('aria-pressed', String(mode === value)); modes.append(b);
  }
  board.append(modes);
  const description = mode === 'adaptive' ? 'The local director notices mistakes. Then gets ideas.'
    : mode === 'challenge' ? 'A fixed deck with identical round limits. Share it and settle this.'
    : '10 graded questions. No answer deadline or lives. Read, learn, continue.';
  board.append(element('p', 'mode-description', description));
  if (PRESET && !PRESET.valid) board.append(element('p', 'notice', 'That challenge link was invalid. A fresh game is ready.'));
  if (fixedSeed && mode === 'challenge') board.append(element('p', 'seed-label', `CHALLENGE SEED  ${fixedSeed}`));
  actions.append(button(mode === 'practice' ? 'LET ME PRACTISE →' : 'PANIC →', start, 'button primary large'));
  narrator.textContent = 'I give the instructions. You provide the errors.';
  footerText.textContent = 'Mouse · touch · keyboard   /   Local director, no cloud calls';
  clockEl.textContent = mode === 'practice' ? '∞' : '60.0'; scoreEl.textContent = '0'; correctEl.textContent = '—'; livesEl.textContent = mode === 'practice' ? '∞' : '● ● ● ●';
  roundCaption.textContent = 'READY WHEN YOU ARE'; streakEl.textContent = prefs.best ? `PERSONAL BEST ${prefs.best}` : 'NO ACCOUNTS. NO TRACKING.';
  totalProgress.value = 0; roundProgress.value = 0;
}
function start(): void {
  if (engine && engine.phase !== 'finished') return;
  stopLoop(); reviewIndex = null; resultNote = ''; lastReceiptId = ''; lastEndId = ''; viewKey = '';
  const runSeed = mode === 'challenge' ? (fixedSeed ??= seed()) : seed();
  engine = new Engine({seed: runSeed, mode, runId: `run${++runNumber}`}); engine.start();
  void audio.unlock(); pauseButton.hidden = false; pauseButton.textContent = 'Pause';
  modeLabel.textContent = labelMode(mode); lastFrame = performance.now();
  render(); queue();
}
function stopLoop(): void { if (raf !== null) cancelAnimationFrame(raf); raf = null; }
function needsLoop(): boolean {
  if (!engine || engine.paused || engine.phase === 'finished' || disposed) return false;
  if (engine.options.mode === 'practice') {
    if (engine.phase === 'feedback') return false;
    if (engine.phase === 'active' && engine.round && ['choice', 'typing', 'memory'].includes(engine.round.kind)) return false;
    if (engine.phase === 'active' && engine.round?.kind === 'reaction' && engine.reactionPresented) return false;
  }
  return true;
}
function queue(): void { if (raf === null && needsLoop()) raf = requestAnimationFrame(frame); }
function frame(now: number): void {
  raf = null;
  if (!root.isConnected) { dispose(); return; }
  synchronize(now); render(); queue();
}
/** Long scheduling gaps pause play instead of silently spending the player's lives. */
function synchronize(now = performance.now()): void {
  if (!engine || engine.paused || engine.phase === 'finished') { lastFrame = now; return; }
  const delta = Math.max(0, now - lastFrame); lastFrame = now;
  const staticPractice = engine.options.mode === 'practice' && engine.phase === 'active' && (['choice', 'typing', 'memory'].includes(engine.round?.kind ?? '') || engine.reactionPresented);
  if (delta > 350 && !staticPractice) {
    pause('The browser paused. So did the game.'); return;
  }
  engine.step(delta);
}
function pause(message = 'No time lost. No lives lost.'): void {
  if (!engine?.pause()) return;
  stopLoop(); resultNote = message; viewKey = ''; render();
}
function resume(): void {
  if (!engine) return; engine.resume(); resultNote = ''; viewKey = ''; lastFrame = performance.now(); render(); queue();
}
function answer(token: string, value: string): void {
  synchronize();
  if (engine?.answer(token, value)) audio.play(engine.lastReceipt?.outcome === 'correct' ? 'correct' : 'wrong');
  render(); queue();
}
function continuePractice(): void {
  if (!engine) return;
  engine.continuePractice(); lastFrame = performance.now(); render(); queue();
}
function setTyped(next: string, token = engine?.round?.id): void {
  if (!engine || engine.phase !== 'active' || engine.paused || engine.round?.kind !== 'typing' || token !== engine.round.id) return;
  inputValue = next.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 12);
  const output = document.getElementById('typed-answer'); if (output) output.textContent = inputValue || '…';
}
function renderRound(round: Round): void {
  if (!engine) return;
  const e = engine, armed = e.phase === 'active';
  clearScene(round.kind === 'memory' ? 'MEMORY SETUP · NOT GRADED' : `ROUND ${e.summary().attempted + 1} · ${round.category.toUpperCase()}`, round.title, round.hint);
  board.dataset['kind'] = round.kind;
  board.dataset['round'] = round.id;
  root.dataset['tone'] = 'neutral';
  const token = round.id;
  if (round.kind === 'choice') {
    const list = element('div', round.symbol ? 'options symbols' : `options count-${round.options.length}`);
    for (const [index, option] of round.options.entries()) {
      const choice = button('', () => answer(token, option.id), 'choice'); choice.disabled = !armed;
      choice.dataset['answer'] = option.id;
      if (round.symbol) choice.setAttribute('aria-label', `Shape ${index + 1}: ${option.label}`);
      if (option.icon) choice.append(element('span', `server-icon ${option.icon}`, option.icon === 'fire' ? '!' : '≡'));
      const text = element('span', 'choice-label', option.label); choice.append(text);
      choice.append(element('kbd', '', String(index + 1))); list.append(choice);
    }
    board.append(list);
  } else if (round.kind === 'typing') {
    if (inputToken !== token) { inputToken = token; inputValue = ''; }
    const output = element('output', 'typed-answer', inputValue || '…'); output.id = 'typed-answer'; output.setAttribute('aria-label', 'Your typed answer');
    board.append(output);
    const pad = element('div', 'keypad');
    for (const char of round.alphabet) { const key = button(char, () => setTyped(inputValue + char, token), 'key'); key.disabled = !armed; pad.append(key); }
    const back = button('⌫', () => setTyped(inputValue.slice(0, -1), token), 'key'); back.setAttribute('aria-label', 'Backspace'); back.disabled = !armed; pad.append(back);
    board.append(pad);
    const send = button('SEND ↵', () => answer(token, inputValue), 'button primary'); send.disabled = !armed; actions.append(send);
  } else if (round.kind === 'memory') {
    board.append(element('div', 'memory-code', round.memoryValue ?? ''));
    board.append(element('div', 'neutral-label', 'LOOK ONLY · THIS DOES NOT CHANGE YOUR ACCURACY'));
    if (mode === 'practice') { const next = button('STORED. NEXT →', continuePractice, 'button primary'); next.disabled = !armed; actions.append(next); }
  } else if (round.kind === 'reaction') {
    const due = armed && e.cueDue;
    if (due) { prompt.textContent = 'NOW. GO!'; hint.textContent = 'One press. No hesitation.'; }
    const press = button(due ? 'GO!' : 'WAIT…', () => answer(token, 'go'), `button bait${due ? ' go' : ''}`);
    press.disabled = !armed; press.dataset['answer'] = 'go'; board.append(press);
    // Input synchronization does not call this until after resolving that input.
    // A click while WAIT is still displayed is therefore consistently early.
    if (due && !e.reactionPresented) { e.presentReaction(token); audio.play('ready'); }
  } else if (round.kind === 'override') {
    if (armed && e.cueDue) {
      prompt.textContent = 'CLICK THIS BUTTON.';
      hint.textContent = 'Remember the first rule.';
      const press = button('CLICK ME', () => answer(token, 'press'), 'button bait'); press.dataset['answer'] = 'press'; board.append(press);
    } else board.append(element('div', 'memory-code small-code', 'IGNORE'));
  } else {
    const press = button(round.options[0]?.label ?? 'PRESS', () => answer(token, 'press'), 'button bait');
    press.disabled = !armed; press.dataset['answer'] = 'press'; board.append(press);
    board.append(element('span', 'bait-caption', 'IT IS, IN FACT, BAIT.'));
  }
}
function roast(receipt: Receipt): string {
  if (receipt.outcome === 'observed') return 'Saved. Allegedly.';
  if (receipt.outcome === 'cancelled') return 'Time called. That last one does not count.';
  if (receipt.outcome === 'correct') return ['Annoyingly competent.', 'Fine. You can have that one.', 'I was hoping you would miss that.', 'Correct. Try not to make a habit of it.'][engine!.summary().correct % 4]!;
  const lines = {reflex: 'Fast hands. A questionable brake pedal.', attention: 'Confidence was not the issue.', words: 'The instructions would like a word.', numbers: 'The calculator has declined your call.', memory: 'RAM not found. Please do not restart yourself.'};
  return lines[receipt.category];
}
function renderFeedback(receipt: Receipt): void {
  const neutral = receipt.outcome === 'observed' || receipt.outcome === 'cancelled';
  const success = receipt.outcome === 'correct';
  clearScene(neutral ? 'NOT A GRADED QUESTION' : success ? 'ANSWER ACCEPTED' : 'REFEREE RECEIPT', neutral ? 'NOTED.' : success ? 'CORRECT.' : receipt.outcome === 'timeout' ? 'TIME’S UP.' : 'MISREAD.', receipt.explanation);
  root.dataset['tone'] = neutral ? 'neutral' : success ? 'correct' : 'wrong';
  if (!neutral) {
    board.append(element('div', 'reward', success ? `+${receipt.scoreDelta}` : `ANSWER: ${receipt.expected}`));
    board.append(element('p', 'mode-description', success ? `${receipt.streak} IN A ROW · ${receipt.multiplier}× POINTS` : 'One mistake. One receipt. No mystery scoring.'));
  }
  if (mode === 'practice') actions.append(button('CONTINUE →', continuePractice, 'button primary'));
  narrator.textContent = roast(receipt);
}
function renderEnd(): void {
  if (!engine) return;
  const sum = engine.summary();
  const clean = sum.attempted > 0 && sum.correct === sum.attempted;
  clearScene(engine.endReason === 'lives' ? 'HUMAN ERROR DETECTED' : mode === 'practice' ? 'PRACTICE COMPLETE' : 'YOU SURVIVED.', clean ? 'NO NOTES.\nUNFORTUNATELY.' : 'ERRORS\nWERE MADE.', clean ? 'Every completed answer was correct. Yes, every single one.' : 'The machine kept receipts. You can inspect every answer.');
  root.dataset['tone'] = clean ? 'correct' : 'neutral'; pauseButton.hidden = false; pauseButton.textContent = 'Modes';
  const card = element('div', 'result-card');
  card.append(element('span', 'bracket', 'CORRECT ANSWERS'), element('div', 'result-ratio', `${sum.correct} / ${sum.attempted}`), element('div', 'result-meta', `${sum.accuracy ?? '—'}% ACCURACY  ·  ${sum.score.toLocaleString()} POINTS`));
  board.append(card);
  const facts = element('p', 'mode-description', `Best streak: ${sum.bestStreak} · ${sum.observed} setup screens excluded · ${sum.cancelled} unfinished excluded${engine.assisted ? ' · Paused run' : ''}`);
  board.append(facts);
  const again = button('AGAIN →', () => { if (!engine) return; engine = null; start(); }, 'button primary');
  const review = button('Answers', () => { reviewIndex = 0; viewKey = ''; render(); }); review.setAttribute('aria-label', 'Review answers');
  const challenge = button('Challenge', share); challenge.setAttribute('aria-label', 'Challenge a friend');
  actions.append(again, review, challenge);
  narrator.textContent = resultNote || (clean ? 'I have checked. I cannot blame the scoring this time.' : 'This is a game report, not a personality diagnosis. Mercifully.');
  footerText.textContent = 'Local, unverified score · Open source · Your result stays in this browser';
}
function renderReview(): void {
  if (!engine || reviewIndex === null) return;
  const receipts = engine.ledger.filter(r => ['correct', 'wrong', 'timeout'].includes(r.outcome));
  const receipt = receipts[reviewIndex];
  if (!receipt) { reviewIndex = null; renderEnd(); return; }
  clearScene(`ANSWER ${reviewIndex + 1} / ${receipts.length} · ${receipt.outcome.toUpperCase()}`, receipt.prompt, receipt.explanation);
  root.dataset['tone'] = receipt.outcome === 'correct' ? 'correct' : 'wrong';
  const report = element('div', 'receipt-card');
  report.append(element('span', 'bracket', 'EXPECTED'), element('p', 'receipt-answer', receipt.expected), element('span', 'bracket', 'YOUR RESPONSE'), element('p', '', receipt.submitted ?? (receipt.outcome === 'correct' ? 'Correctly waited' : 'No answer before the deadline')));
  board.append(report);
  const previous = button('← Previous', () => { reviewIndex = Math.max(0, reviewIndex! - 1); viewKey = ''; render(); }); previous.disabled = reviewIndex === 0;
  const next = button('Next →', () => { reviewIndex = Math.min(receipts.length - 1, reviewIndex! + 1); viewKey = ''; render(); }); next.disabled = reviewIndex === receipts.length - 1;
  actions.append(previous, next, button('Back to result', () => { reviewIndex = null; viewKey = ''; render(); }), button('Export receipts', exportReceipts));
  narrator.textContent = 'No secret denominator. These are the answers that actually counted.';
}
function render(): void {
  if (!engine) return;
  const e = engine;
  if (e.lastReceipt && e.lastReceipt.id !== lastReceiptId) { lastReceiptId = e.lastReceipt.id; narrator.textContent = roast(e.lastReceipt); }
  if (e.phase === 'finished' && lastEndId !== e.options.runId) {
    lastEndId = e.options.runId; audio.play('finish');
    if (mode === 'adaptive' && !e.assisted) { prefs.best = Math.max(prefs.best, e.summary().score); savePrefs(); }
  }
  const cue = e.round && ['reaction', 'override'].includes(e.round.kind) && e.cueDue;
  const key = `${e.options.runId}:${e.phase}:${e.round?.id}:${cue}:${e.paused}:${reviewIndex}:${resultNote}`;
  if (key !== viewKey) {
    viewKey = key; root.dataset['phase'] = e.paused ? 'paused' : e.phase;
    if (e.paused) {
      clearScene('BREATHING ROOM', 'PAUSED.', resultNote || 'No time lost. No lives lost.');
      actions.append(button('RESUME →', resume, 'button primary'), button('Start over', intro));
      narrator.textContent = 'The machine can wait. Apparently.';
    } else if (e.phase === 'finished') {
      if (reviewIndex !== null) renderReview(); else renderEnd();
    } else if (e.phase === 'feedback' && e.lastReceipt) renderFeedback(e.lastReceipt);
    else if (e.round) renderRound(e.round);
  }
  const now = performance.now();
  if (now - hudAt > 65 || e.phase === 'finished' || e.phase === 'feedback') { hudAt = now; updateHud(); }
}
function updateHud(): void {
  if (!engine) return;
  const e = engine, sum = e.summary();
  clockEl.textContent = mode === 'practice' ? '∞' : (e.runRemaining / 1000).toFixed(1);
  scoreEl.textContent = sum.score.toLocaleString(); correctEl.textContent = `${sum.correct}/${sum.attempted}`;
  livesEl.textContent = mode === 'practice' ? '∞' : '● '.repeat(e.lives).trim() + (e.lives < 4 ? ` ${'○ '.repeat(4 - e.lives).trim()}` : '');
  livesEl.setAttribute('aria-label', mode === 'practice' ? 'No lives limit' : `${e.lives} lives remaining`);
  totalProgress.max = e.budgetMs; totalProgress.value = Math.min(e.budgetMs, e.runElapsed);
  roundProgress.max = e.round?.duration ?? 1;
  roundProgress.value = e.phase === 'active' && Number.isFinite(e.roundRemaining) ? e.roundRemaining : 0;
  const phase = e.ordinal < 5 ? 'WARMUP' : e.ordinal < 12 ? 'PANIC' : 'CHAOS';
  modeLabel.textContent = e.phase === 'finished' ? labelMode(mode) : `${labelMode(mode)} / ${phase}`;
  roundCaption.textContent = e.paused ? 'PAUSED' : e.phase === 'arming' ? 'READ THE RULE…' : e.phase === 'feedback' ? 'RECEIPT SAVED'
    : e.phase === 'finished' ? 'COMPLETE' : e.round?.kind === 'memory' ? 'SETUP ONLY · NOT GRADED' : Number.isFinite(e.roundRemaining) ? `${(e.roundRemaining / 1000).toFixed(1)}s TO ANSWER` : 'TAKE YOUR TIME';
  streakEl.textContent = `${e.streak} IN A ROW · ${e.multiplier}× POINTS`;
  if (e.phase !== 'finished') footerText.textContent = mode === 'practice' ? 'Practice: answers are untimed · Enter continues · P pauses' : '60 seconds of active play · Feedback does not steal your time · P pauses';
}
async function share(): Promise<void> {
  if (!engine) return;
  const link = challengeLink(location.href, engine.options.seed);
  const sum = engine.summary();
  const text = mode === 'challenge' ? `HUMAN ERROR: ${sum.score} points, ${sum.correct}/${sum.attempted} correct. Same deck. Your turn. (Local score.)`
    : 'Think you can follow instructions? HUMAN ERROR has questions. Here is a fixed-deck challenge.';
  try {
    if (link && navigator.share) { await navigator.share({title: 'HUMAN ERROR', text, url: link}); return; }
    if (navigator.clipboard && link) { await navigator.clipboard.writeText(`${text}\n${link}`); resultNote = 'Challenge copied. Same seed, same fixed deck. Scores are local and unverified.'; viewKey = ''; render(); return; }
  } catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return; }
  clearScene('COPY YOUR CHALLENGE', 'THEIR TURN.', 'Fixed-deck challenge. No personal data in this link.');
  const field = element('textarea', 'share-text'); field.readOnly = true; field.setAttribute('aria-label', 'Challenge text');
  field.value = link ? `${text}\n${link}` : `Challenge seed: ${engine.options.seed}. Host this page over HTTPS to share a playable link.`;
  board.append(field); field.focus(); field.select();
  actions.append(button('Back to result', () => { viewKey = ''; render(); }));
}
function exportReceipts(): void {
  if (!engine) return;
  const payload = {game: 'HUMAN ERROR', version: '0.2.0', ruleset: RULESET, mode, seed: engine.options.seed, assisted: engine.assisted, endReason: engine.endReason, activeMs: Math.round(engine.runElapsed), survivalBonus: engine.endReason === 'time' ? 1000 : 0, summary: engine.summary(), receipts: engine.ledger};
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'}));
  const a = element('a'); a.href = url; a.download = 'human-error-receipts.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  narrator.textContent = 'Exported. Every answer, its expected result, and why it counted.';
}
function keyboard(event: KeyboardEvent): void {
  if (event.repeat || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || !engine) return;
  if (event.key.toLowerCase() === 'p' && engine.round?.kind !== 'typing') { event.preventDefault(); if (engine.paused) resume(); else pause(); return; }
  if (engine.paused || engine.phase === 'finished') return;
  if (engine.phase === 'feedback' && mode === 'practice' && event.key === 'Enter') { event.preventDefault(); continuePractice(); return; }
  const round = engine.round; if (!round || engine.phase !== 'active') return;
  const target = event.target as HTMLElement | null;
  // Space/Enter on a focused button are handled by native click, not twice here.
  if ((event.key === 'Enter' || event.key === ' ') && target?.tagName === 'BUTTON') return;
  if (round.kind === 'typing') {
    if (/^[a-zA-Z]$/.test(event.key)) { event.preventDefault(); setTyped(inputValue + event.key); }
    else if (event.key === 'Backspace') { event.preventDefault(); setTyped(inputValue.slice(0, -1)); }
    else if (event.key === 'Enter') { event.preventDefault(); answer(round.id, inputValue); }
  } else if (round.kind === 'choice' && /^[1-9]$/.test(event.key)) {
    const option = round.options[Number(event.key) - 1]; if (option) { event.preventDefault(); answer(round.id, option.id); }
  } else if ((event.key === ' ' || event.key === 'Enter') && ['wait', 'reaction', 'override'].includes(round.kind)) {
    event.preventDefault(); answer(round.id, round.kind === 'reaction' ? 'go' : 'press');
  } else if (round.kind === 'memory' && mode === 'practice' && event.key === 'Enter') { event.preventDefault(); continuePractice(); }
}
function dispose(): void { disposed = true; stopLoop(); abort.abort(); audio.dispose(); }
soundButton.textContent = prefs.sound ? 'Sound on' : 'Sound off'; soundButton.setAttribute('aria-pressed', String(prefs.sound));
soundButton.addEventListener('click', () => {
  prefs.sound = !prefs.sound; audio.enabled = prefs.sound; savePrefs();
  soundButton.textContent = prefs.sound ? 'Sound on' : 'Sound off'; soundButton.setAttribute('aria-pressed', String(prefs.sound));
  void audio.unlock().then(() => audio.play('ready'));
}, {signal: abort.signal});
pauseButton.addEventListener('click', () => { if (engine?.phase === 'finished') intro(); else if (engine?.paused) resume(); else pause(); }, {signal: abort.signal});
document.addEventListener('keydown', keyboard, {signal: abort.signal});
document.addEventListener('visibilitychange', () => { if (document.hidden) pause('Tab hidden. The timer and your lives are safe.'); }, {signal: abort.signal});
window.addEventListener('blur', () => pause('Focus moved away. Resume when you are ready.'), {signal: abort.signal});
window.addEventListener('pagehide', event => { if (event.persisted) pause(); else dispose(); }, {signal: abort.signal});
window.addEventListener('pageshow', () => { lastFrame = performance.now(); }, {signal: abort.signal});
root.dataset['motion'] = reducedMotion.matches ? 'reduced' : 'normal';
reducedMotion.addEventListener('change', () => { root.dataset['motion'] = reducedMotion.matches ? 'reduced' : 'normal'; }, {signal: abort.signal});
intro();
