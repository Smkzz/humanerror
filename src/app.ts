import { AudioCues } from './audio.js';
import { challengeLink, parseChallenge, Preferences, readPreferences } from './challenge.js';
import { Engine, GAME_VERSION, RULESET } from './engine.js';
import { incrementGamesPlayed, LeaderboardEntry, leaderboardRank, PlayerProfile, readPlayerProfile, recordAdaptiveScore, recordSharedLeaderboard, sanitizePlayerName } from './profile.js';
import { Mode, Receipt, Round, Summary, Template } from './types.js';

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
const PREF_KEY = 'human-error:v4';
const LEGACY_PREF_KEY = 'human-error:v3';
const PROFILE_KEY = 'human-error:leaderboard:v4';
const LEADERBOARD_ENDPOINT = '/api/leaderboard';
const RUN_SESSIONS_ENDPOINT = '/api/run-sessions';
const legacyPrefs: Preferences = (() => { try { return readPreferences(localStorage.getItem(LEGACY_PREF_KEY)); } catch { return readPreferences(null); } })();
const prefs: Preferences = (() => {
  try {
    const current = localStorage.getItem(PREF_KEY);
    if (current === null) return {sound: legacyPrefs.sound, best: legacyPrefs.best};
    const parsed = readPreferences(current);
    return {sound: parsed.sound, best: Math.max(parsed.best, legacyPrefs.best)};
  } catch { return legacyPrefs; }
})();
let profile: PlayerProfile = (() => { try { return readPlayerProfile(localStorage.getItem(PROFILE_KEY)); } catch { return readPlayerProfile(null); } })();
let leaderboardScope: 'shared' | 'local' | 'loading' = location.protocol === 'http:' || location.protocol === 'https:' ? 'loading' : 'local';
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
let playerName = profile.name;
let engine: Engine | null = null, runNumber = 0, raf: number | null = null, lastFrame = 0, hudAt = 0;
let viewKey = '', lastReceiptId = '', lastEndId = '', inputValue = '', inputToken = '';
let counterValue = 0, counterToken = '';
let reviewIndex: number | null = null;
let resultNote = '';
interface RunSession { id: string; seed: string; version: string; ruleset: string; issuedAt: number; expiresAt: number; }
interface RunAction { roundId: string; elapsedMs: number; value: string; reactionPresented: boolean; overridePresented: boolean; }
interface VerifiedSubmission { score: number; rank: number | null; previousRank: number | null; previousBestScore: number | null; personalBestScore: number | null; newPersonalBest: boolean; recordedAt: number; }
type SubmissionState = 'pending' | 'accepted' | 'offline' | 'rejected' | 'ineligible' | 'challenge' | 'practice';
let runSession: RunSession | null = null;
let runTranscript: RunAction[] = [];
let transcriptOverflow = false;
let submissionState: SubmissionState = 'offline';
let verifiedSubmission: VerifiedSubmission | null = null;
let localPreviousBest = 0;
let localBestScore = 0;
let localNewBest = false;
let disposed = false;

function savePrefs(): void { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch { /* Optional persistence must never block play. */ } }
function saveProfile(): void { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { /* Local identity is optional persistence. */ } }
function applySharedLeaderboard(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const entries = (value as Record<string, unknown>)['leaderboard'];
  if (!Array.isArray(entries)) return false;
  const next = readPlayerProfile(JSON.stringify({name: playerName, sharedLeaderboard: entries}));
  const rank = leaderboardRank(next.sharedLeaderboard, playerName);
  profile = recordSharedLeaderboard(profile, next.sharedLeaderboard, rank, Date.now());
  saveProfile();
  return true;
}
async function refreshSharedLeaderboard(): Promise<boolean> {
  if (location.protocol === 'file:') { leaderboardScope = 'local'; return false; }
  try {
    const response = await fetch(LEADERBOARD_ENDPOINT, {method:'GET', cache:'no-store', credentials:'same-origin', headers:{Accept:'application/json'}});
    if (!response.ok || !applySharedLeaderboard(await response.json())) throw new Error('Leaderboard unavailable');
    leaderboardScope = 'shared';
    return true;
  } catch { leaderboardScope = 'local'; return false; }
}
async function requestRunSession(): Promise<RunSession | null> {
  if (location.protocol !== 'http:' && location.protocol !== 'https:') return null;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 2200);
  try {
    const response = await fetch(RUN_SESSIONS_ENDPOINT, {method:'POST', cache:'no-store', credentials:'same-origin', headers:{'Content-Type':'application/json', Accept:'application/json'}, body:JSON.stringify({ruleset:RULESET,version:GAME_VERSION}), signal:controller.signal});
    if (!response.ok) return null;
    const value: unknown = await response.json();
    if (typeof value !== 'object' || value === null) return null;
    const v = value as Record<string, unknown>;
    const issuedAt = v['issuedAt'], expiresAt = v['expiresAt'];
    if (typeof v['id'] !== 'string' || !/^[a-f0-9]{32}$/.test(v['id']) || typeof v['seed'] !== 'string' || !/^[A-Za-z0-9_-]{1,32}$/.test(v['seed'])) return null;
    if (v['version'] !== GAME_VERSION || v['ruleset'] !== RULESET || typeof issuedAt !== 'number' || !Number.isSafeInteger(issuedAt) || typeof expiresAt !== 'number' || !Number.isSafeInteger(expiresAt)) return null;
    if (expiresAt <= Date.now() || issuedAt > Date.now() + 5000 || expiresAt - issuedAt > 10 * 60_000) return null;
    return {id:v['id'], seed:v['seed'], version:GAME_VERSION, ruleset:RULESET, issuedAt, expiresAt};
  } catch { return null; }
  finally { window.clearTimeout(timeout); }
}
async function submitVerifiedRun(session: RunSession, name: string, events: readonly RunAction[]): Promise<VerifiedSubmission | 'offline' | 'rejected'> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${RUN_SESSIONS_ENDPOINT}/${encodeURIComponent(session.id)}/submit`, {method:'POST', cache:'no-store', credentials:'same-origin', headers:{'Content-Type':'application/json', Accept:'application/json'}, body:JSON.stringify({ruleset:RULESET,version:GAME_VERSION,name,events}), signal:controller.signal});
    if (!response.ok) return response.status >= 500 || response.status === 429 ? 'offline' : 'rejected';
    const value: unknown = await response.json();
    if (typeof value !== 'object' || value === null) return 'rejected';
    const v = value as Record<string, unknown>;
    const score = v['score'], correct = v['correct'], attempted = v['attempted'], bestStreak = v['bestStreak'];
    const rankValue = v['rank'], previousRankValue = v['previousRank'], previousBestValue = v['previousBestScore'], personalBestValue = v['personalBestScore'], recordedAt = v['recordedAt'];
    if (v['accepted'] !== true || v['validation'] !== 'server-replayed' || v['ruleset'] !== RULESET || v['version'] !== GAME_VERSION) return 'rejected';
    if (typeof score !== 'number' || !Number.isSafeInteger(score) || score < 0 || typeof correct !== 'number' || !Number.isSafeInteger(correct) || correct < 0 || typeof attempted !== 'number' || !Number.isSafeInteger(attempted) || attempted < 1 || typeof bestStreak !== 'number' || !Number.isSafeInteger(bestStreak) || bestStreak < 0 || typeof recordedAt !== 'number' || !Number.isSafeInteger(recordedAt)) return 'rejected';
    if (!(rankValue === null || (typeof rankValue === 'number' && Number.isSafeInteger(rankValue) && rankValue >= 1 && rankValue <= 10)) || !(previousRankValue === null || (typeof previousRankValue === 'number' && Number.isSafeInteger(previousRankValue) && previousRankValue >= 1 && previousRankValue <= 10))) return 'rejected';
    if (!(previousBestValue === null || (typeof previousBestValue === 'number' && Number.isSafeInteger(previousBestValue) && previousBestValue >= 0)) || !(personalBestValue === null || (typeof personalBestValue === 'number' && Number.isSafeInteger(personalBestValue) && personalBestValue >= 0)) || typeof v['newPersonalBest'] !== 'boolean' || !Array.isArray(v['leaderboard'])) return 'rejected';
    const rank = rankValue as number | null, previousRank = previousRankValue as number | null;
    const previousBestScore = previousBestValue as number | null, personalBestScore = personalBestValue as number | null;
    const next = readPlayerProfile(JSON.stringify({name, sharedLeaderboard:v['leaderboard']}));
    if (leaderboardRank(next.sharedLeaderboard, name) !== rank) return 'rejected';
    profile = recordSharedLeaderboard(profile, next.sharedLeaderboard, rank, recordedAt);
    saveProfile(); leaderboardScope = 'shared';
    return {score, rank, previousRank, previousBestScore, personalBestScore, newPersonalBest:v['newPersonalBest'], recordedAt};
  } catch { return 'offline'; }
  finally { window.clearTimeout(timeout); }
}
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
function leaderboardScopeLabel(): string {
  if (leaderboardScope === 'shared') return 'SHARED';
  if (leaderboardScope === 'loading') return profile.sharedLeaderboard.length ? 'CACHED' : 'LOADING';
  return 'LOCAL';
}
function visibleLeaderboard(): readonly LeaderboardEntry[] {
  if (leaderboardScope === 'shared' || (leaderboardScope === 'loading' && profile.sharedLeaderboard.length)) return profile.sharedLeaderboard;
  return leaderboardScope === 'local' ? profile.leaderboard : [];
}
function leaderboardPanel(limit = 10): HTMLElement {
  const wrap = element('div', `leaderboard${limit <= 3 ? ' compact' : ''}`);
  wrap.append(element('div', 'leaderboard-title', `${leaderboardScopeLabel()} ${limit <= 3 ? 'TOP 3' : 'DOMINATION BOARD'}`));
  const entries = visibleLeaderboard().slice(0, limit);
  if (!entries.length) {
    const empty = leaderboardScope === 'shared' ? 'No shared scores yet. Be the first problem.'
      : leaderboardScope === 'loading' ? 'Checking for shared scores…' : 'No local scores yet. Shared board unavailable.';
    wrap.append(element('p', 'leaderboard-empty', empty));
    return wrap;
  }
  for (const [index, entry] of entries.entries()) {
    const row = element('div', `leaderboard-row${entry.name.toLocaleLowerCase() === playerName.toLocaleLowerCase() ? ' current' : ''}`);
    row.append(element('span', 'leaderboard-rank', `#${index + 1}`), element('strong', 'leaderboard-name', entry.name), element('span', 'leaderboard-score', entry.score.toLocaleString()));
    wrap.append(row);
  }
  return wrap;
}
function drawLeaderboardView(): void {
  stopLoop(); engine = null; reviewIndex = null; pauseButton.hidden = true; root.dataset['phase'] = 'intro'; root.dataset['tone'] = 'neutral';
  const scope = leaderboardScopeLabel();
  clearScene(`${scope} LEADERBOARD`, 'WHO\nDOMINATES?', leaderboardScope === 'shared' ? 'Best server-validated Adaptive run per display name.' : leaderboardScope === 'loading' ? 'Refreshing the shared board. Cached scores are labelled.' : 'Shared board unavailable. Showing this browser’s local scores.');
  board.append(leaderboardPanel(10));
  actions.append(button('← Back', intro, 'button primary'));
  narrator.textContent = leaderboardScope === 'shared' ? 'No account. Each accepted Adaptive run is replayed before it ranks.' : 'Offline fallback. These scores are only from this browser.';
  footerText.textContent = leaderboardScope === 'shared' ? 'Shared top 10 · Server-replayed Adaptive results · No account' : `${scope} scores · Shared leaderboard unavailable`;
}
function leaderboardView(): void {
  drawLeaderboardView();
  void refreshSharedLeaderboard().then(() => { if (root.dataset['view']?.endsWith('LEADERBOARD')) drawLeaderboardView(); });
}
function competitionPanel(): HTMLElement {
  const entries = visibleLeaderboard();
  const ownShared = profile.sharedLeaderboard.find(entry => entry.name.toLowerCase() === playerName.toLowerCase());
  const ownLocal = profile.leaderboard.find(entry => entry.name.toLowerCase() === playerName.toLowerCase());
  const live = leaderboardScope === 'shared';
  const own = live ? ownShared : ownLocal;
  const rank = live ? leaderboardRank(profile.sharedLeaderboard, playerName) : null;
  const first = entries[0];
  const panel = element('div', 'competition-panel');
  panel.append(element('div', 'competition-heading', `${leaderboardScopeLabel()} TOP 3`));
  if (leaderboardScope === 'loading' && profile.sharedLeaderboard.length && profile.lastKnownRankAt !== null) {
    panel.append(element('div', 'competition-cache', `CACHED · RETRIEVED ${new Date(profile.lastKnownRankAt).toLocaleString()}`));
  }
  if (!entries.length) panel.append(element('p', 'competition-empty', leaderboardScope === 'shared' ? 'No scores yet. Set the first target.' : leaderboardScope === 'loading' ? 'Refreshing the board…' : 'Play now. Your local best stays on this device.'));
  for (const [index, entry] of entries.slice(0, 3).entries()) {
    const row = element('div', `competition-row${entry.name.toLowerCase() === playerName.toLowerCase() && live ? ' current' : ''}`);
    row.append(element('span', 'leaderboard-rank', `#${index + 1}`), element('strong', 'leaderboard-name', entry.name), element('span', 'leaderboard-score', entry.score.toLocaleString()));
    panel.append(row);
  }
  const localScore = own?.score ?? (!live && playerName ? prefs.best : 0);
  const bestLabel = `${live ? 'SHARED PB' : 'LOCAL PB'} ${localScore ? localScore.toLocaleString() : '—'}`;
  let targetLabel = '';
  if (live && rank === 1) targetLabel = '#1 · DEFEND';
  else if (live && rank && own) {
    const next = entries[rank - 2];
    const gap = next ? Math.max(0, next.score - own.score + 1) : null;
    targetLabel = gap === null ? `#${rank}` : `#${rank} · ${gap.toLocaleString()} TO #${rank - 1}`;
  } else if (first) {
    const gap = Math.max(0, first.score - localScore + 1);
    targetLabel = `${leaderboardScope === 'shared' ? '' : leaderboardScope === 'loading' ? 'CACHED ' : 'LOCAL '}${gap.toLocaleString()} TO #1`;
  } else targetLabel = 'BE FIRST';
  panel.append(element('div', 'competition-summary', `${bestLabel} · ${targetLabel}`));
  return panel;
}
function storePlayerName(raw: string): string {
  const name = sanitizePlayerName(raw);
  if (!name) return '';
  playerName = name; profile = Object.freeze({...profile, name});
  if (prefs.best > 0 && !profile.leaderboard.some(entry => entry.name.toLowerCase() === name.toLowerCase())) {
    profile = recordAdaptiveScore(profile, {name, score:prefs.best, correct:0, attempted:0, bestStreak:0, recordedAt:Date.now()});
  }
  saveProfile();
  return name;
}
function startFromIntro(): void {
  const input = document.getElementById('player-name') as HTMLInputElement | null;
  const name = storePlayerName(input?.value ?? playerName);
  if (!name) {
    if (input) { input.setAttribute('aria-invalid', 'true'); input.focus(); }
    narrator.textContent = 'I need a name for the incident report. Registration is still not a thing.';
    return;
  }
  start();
}
function intro(): void {
  stopLoop(); engine = null; reviewIndex = null; viewKey = ''; resultNote = ''; runSession = null; runTranscript = []; transcriptOverflow = false; verifiedSubmission = null;
  pauseButton.hidden = true; root.dataset['tone'] = 'neutral'; root.dataset['phase'] = 'intro';
  modeLabel.textContent = labelMode(mode);
  const title = visibleLeaderboard().length ? 'BEAT #1.' : 'CLAIM #1.';
  clearScene(leaderboardScope === 'shared' ? 'SHARED COMPETITION' : `${leaderboardScopeLabel()} COMPETITION`, title, 'Adaptive results count after a server replay. No accounts. Bring receipts.');
  const hero = element('div', 'intro-copy');
  hero.append(element('span', 'bracket', '[ HUMAN ERROR / v0.4 · TOP 10 ]'));
  board.append(hero);
  const identity = element('div', 'identity');
  const label = element('label', 'identity-label', 'PLAYER NAME'); label.htmlFor = 'player-name';
  const nameInput = element('input', 'name-input'); nameInput.id = 'player-name'; nameInput.type = 'text'; nameInput.maxLength = 36; nameInput.setAttribute('autocomplete', 'off'); nameInput.placeholder = 'Your name'; nameInput.value = playerName;
  nameInput.setAttribute('aria-label', 'Player name');
  nameInput.addEventListener('input', () => { nameInput.removeAttribute('aria-invalid'); playerName = sanitizePlayerName(nameInput.value); });
  nameInput.addEventListener('change', () => { const stored = storePlayerName(nameInput.value); if (stored) nameInput.value = stored; });
  identity.append(label, nameInput, element('span', 'identity-note', 'No registration. Name stays here.'));
  board.append(identity);
  board.append(competitionPanel());
  const modes = element('div', 'mode-picker'); modes.setAttribute('role', 'group'); modes.setAttribute('aria-label', 'Game mode');
  for (const [value, text] of [['adaptive', 'Adaptive'], ['challenge', 'Challenge'], ['practice', 'Practice']] as const) {
    const b = button(text, () => { storePlayerName(nameInput.value); mode = value; intro(); }, `mode-button${mode === value ? ' selected' : ''}`);
    b.setAttribute('aria-pressed', String(mode === value)); modes.append(b);
  }
  board.append(modes);
  const description = mode === 'adaptive' ? '60 seconds · 4 lives · the server replays each submitted run.'
    : mode === 'challenge' ? 'A fixed deck with identical round limits. Great for direct challenges; not ranked.'
    : '10 graded questions. No answer deadline or lives. Practice does not enter the leaderboard.';
  board.append(element('p', 'mode-description', description));
  if (PRESET && !PRESET.valid) board.append(element('p', 'notice', 'That challenge link was invalid. A fresh game is ready.'));
  if (fixedSeed && mode === 'challenge') board.append(element('p', 'seed-label', `CHALLENGE SEED  ${fixedSeed}`));
  actions.append(button(mode === 'practice' ? 'LET ME PRACTISE →' : 'PANIC →', startFromIntro, 'button primary large'), button('Leaderboard', leaderboardView));
  narrator.textContent = playerName ? `${playerName}, beat the target. Valid Adaptive runs are replayed before they rank.` : 'Give me a name. Registration remains unavailable.';
  footerText.textContent = 'Adaptive is ranked · Challenge uses a fixed deck · Practice stays local';
  clockEl.textContent = mode === 'practice' ? '∞' : '60.0'; scoreEl.textContent = '0'; correctEl.textContent = '—'; livesEl.textContent = mode === 'practice' ? '∞' : '● ● ● ●';
  roundCaption.textContent = `${profile.gamesPlayed} RUNS PLAYED`;
  totalProgress.value = 0; roundProgress.value = 0;
}
async function start(): Promise<void> {
  if (engine && engine.phase !== 'finished') return;
  const selectedMode = mode, thisRun = ++runNumber;
  stopLoop(); engine = null; reviewIndex = null; resultNote = ''; lastReceiptId = ''; lastEndId = ''; viewKey = ''; counterValue = 0; counterToken = '';
  runSession = null; runTranscript = []; transcriptOverflow = false; verifiedSubmission = null; localNewBest = false;
  if (selectedMode === 'adaptive') {
    pauseButton.hidden = true; root.dataset['phase'] = 'starting';
    clearScene('ADAPTIVE SESSION', 'CONNECTING.', 'Getting a one-time server session. The game still works offline.');
    board.append(element('div', 'competition-empty', 'Shared results need a server-replayed run.'));
    const loading = button('STARTING…', () => {}, 'button primary large'); loading.disabled = true; actions.append(loading);
    runSession = await requestRunSession();
    if (thisRun !== runNumber || disposed) return;
    submissionState = runSession ? 'pending' : 'offline';
  } else submissionState = selectedMode === 'challenge' ? 'challenge' : 'practice';
  const runSeed = selectedMode === 'challenge' ? (fixedSeed ??= seed()) : runSession?.seed ?? seed();
  const runId = runSession?.id ?? `run-${thisRun}`;
  engine = new Engine({seed: runSeed, mode:selectedMode, runId}); engine.start();
  void audio.unlock(); pauseButton.hidden = false; pauseButton.textContent = 'Pause';
  modeLabel.textContent = labelMode(selectedMode); lastFrame = performance.now();
  render(); queue();
}
function stopLoop(): void { if (raf !== null) cancelAnimationFrame(raf); raf = null; }
function needsLoop(): boolean {
  if (!engine || engine.paused || engine.phase === 'finished' || disposed) return false;
  if (engine.options.mode === 'practice') {
    if (engine.phase === 'feedback') return false;
    if (engine.phase === 'active' && engine.round && ['choice', 'typing', 'memory', 'counter'].includes(engine.round.kind)) return false;
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
  const staticPractice = engine.options.mode === 'practice' && engine.phase === 'active' && (['choice', 'typing', 'memory', 'counter'].includes(engine.round?.kind ?? '') || engine.reactionPresented);
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
  if (engine?.answer(token, value)) {
    if (runSession && engine.options.mode === 'adaptive') {
      if (runTranscript.length < 512) runTranscript.push({roundId:token, elapsedMs:Math.max(0, Number(engine.elapsed.toFixed(3))), value, reactionPresented:engine.reactionPresented, overridePresented:engine.overridePresented});
      else transcriptOverflow = true;
    }
    audio.play(engine.lastReceipt?.outcome === 'correct' ? 'correct' : 'wrong');
  }
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
function setCounter(next: number, token = engine?.round?.id): void {
  if (!engine || engine.phase !== 'active' || engine.paused || engine.round?.kind !== 'counter' || token !== engine.round.id) return;
  counterValue = Math.max(0, Math.min(99, next));
  const output = document.getElementById('counter-value'); if (output) output.textContent = String(counterValue);
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
      if (round.template === 'position') {
        const physical = ['Left', 'Middle', 'Right'][index] ?? `Position ${index + 1}`;
        choice.setAttribute('aria-label', `${physical} position, printed ${option.label}, shortcut ${index + 1}`);
      } else if (round.symbol) choice.setAttribute('aria-label', `Shape ${index + 1}: ${option.label}`);
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
  } else if (round.kind === 'counter') {
    if (counterToken !== token) { counterToken = token; counterValue = 0; }
    const output = element('output', 'counter-value', String(counterValue)); output.id = 'counter-value'; output.setAttribute('aria-label', 'Tap count');
    const tap = button('TAP', () => setCounter(counterValue + 1, token), 'button bait counter-tap'); tap.disabled = !armed;
    board.append(output, tap);
    const send = button('SEND ↵', () => answer(token, String(counterValue)), 'button primary'); send.disabled = !armed; actions.append(send);
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
      if (!e.overridePresented) e.presentOverride(token);
    } else board.append(element('div', 'memory-code small-code', 'IGNORE'));
  } else {
    const press = button(round.options[0]?.label ?? 'PRESS', () => answer(token, 'press'), 'button bait');
    press.disabled = !armed; press.dataset['answer'] = 'press'; board.append(press);
    board.append(element('span', 'bait-caption', 'IT IS, IN FACT, BAIT.'));
  }
}
function resultStatus(sum: Summary): string {
  if (!engine) return 'RUN COMPLETE';
  if (engine.endReason === 'lives') return 'FOUR ERRORS · INCIDENT CLOSED';
  if (sum.attempted === 0) return 'NO GRADED ANSWERS';
  if (sum.correct === sum.attempted) return sum.bestStreak >= 10 ? 'SUSPICIOUSLY CLEAN' : 'CLEAN RUN';
  if ((sum.accuracy ?? 0) >= 90) return 'MINOR INCIDENT';
  if ((sum.accuracy ?? 0) >= 75) return 'PRODUCTION SURVIVED';
  return 'INCIDENT REPORT ATTACHED';
}
function roast(receipt: Receipt): string {
  if (receipt.outcome === 'observed') return 'Saved. Allegedly.';
  if (receipt.outcome === 'cancelled') return 'Time called. That last one does not count.';
  if (receipt.outcome === 'correct') return ['Annoyingly competent.', 'Fine. You can have that one.', 'I was hoping you would miss that.', 'Correct. Try not to make a habit of it.'][engine!.summary().correct % 4]!;
  if (receipt.outcome === 'timeout') return 'Time expired. The receipt has the answer.';
  const traps: Partial<Record<Template, string>> = {
    brakes: 'The button was bait. It remains undefeated.',
    reaction: 'GO was the whole contract.',
    override: 'The second instruction had confidence. The first one had authority.',
    position: 'The button moved nowhere. The word did all the damage.',
    lettercount: 'The letters were all present at the scene.',
    second: 'First place stole your attention.',
    match: 'Almost identical is doing a lot of work there.',
    avoid: 'You found the forbidden number. Efficiently.',
    server: 'Production has opened an incident.',
    counter: 'The machine counted too. Awkward.',
    reverse: 'Backwards was apparently a forward problem.',
    sequence: 'The pattern filed a complaint.'
  };
  if (traps[receipt.template]) return traps[receipt.template]!;
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
function completeRun(e: Engine): void {
  profile = incrementGamesPlayed(profile);
  if (e.options.mode !== 'adaptive') {
    submissionState = e.options.mode === 'challenge' ? 'challenge' : 'practice';
    saveProfile();
    return;
  }
  if (e.assisted) {
    submissionState = 'ineligible'; saveProfile(); return;
  }
  const sum = e.summary();
  const previous = profile.leaderboard.find(entry => entry.name.toLowerCase() === playerName.toLowerCase());
  localPreviousBest = Math.max(previous?.score ?? 0, prefs.best);
  localBestScore = Math.max(localPreviousBest, sum.score);
  localNewBest = sum.score > localPreviousBest;
  prefs.best = Math.max(prefs.best, sum.score); savePrefs();
  profile = recordAdaptiveScore(profile, {name:playerName, score:sum.score, correct:sum.correct, attempted:sum.attempted, bestStreak:sum.bestStreak, recordedAt:Date.now()});
  saveProfile();
  if (!runSession) { submissionState = 'offline'; return; }
  if (transcriptOverflow) { submissionState = 'rejected'; return; }
  submissionState = 'pending';
  const session = runSession, name = playerName, events = runTranscript.slice();
  void submitVerifiedRun(session, name, events).then(result => {
    if (result === 'offline') {
      if (runSession?.id === session.id) { submissionState = 'offline'; leaderboardScope = 'local'; resultNote = 'Shared board unavailable. This result is saved locally only.'; }
    } else if (result === 'rejected') {
      if (runSession?.id === session.id) { submissionState = 'rejected'; resultNote = 'The server did not accept this transcript. This result is local only.'; }
    } else if (runSession?.id === session.id) {
      verifiedSubmission = result; submissionState = 'accepted';
      resultNote = result.newPersonalBest ? 'Server accepted a new personal best.' : 'Server replay accepted this Adaptive result.';
    }
    if (engine?.options.runId === session.id) { viewKey = ''; render(); }
  });
}
function competitionResultPanel(): HTMLElement {
  const panel = element('div', 'competition-result');
  const add = (title: string, detail?: string): void => {
    panel.append(element('strong', 'competition-result-title', title));
    if (detail) panel.append(element('span', 'competition-result-detail', detail));
  };
  if (mode === 'practice') { add('PRACTICE · NOT RANKED'); return panel; }
  if (mode === 'challenge') { add('CHALLENGE · NOT RANKED', 'Fixed-seed results are separate from Adaptive scores.'); return panel; }
  if (engine?.assisted) { add('PAUSED RUN · LEADERBOARD NOT UPDATED'); return panel; }
  if (submissionState === 'pending') { add('SUBMISSION PENDING', 'The server is replaying this run. No shared rank has been assigned yet.'); return panel; }
  if (submissionState === 'accepted' && verifiedSubmission) {
    const result = verifiedSubmission;
    add('SHARED RESULT ACCEPTED');
    if (result.newPersonalBest && result.personalBestScore !== null) {
      add(`NEW PERSONAL BEST · ${result.previousBestScore?.toLocaleString() ?? '—'} → ${result.personalBestScore.toLocaleString()}`);
    } else if (result.previousBestScore !== null && result.personalBestScore !== null) {
      add(`BEST SCORE · ${result.previousBestScore.toLocaleString()} → ${result.personalBestScore.toLocaleString()}`);
    }
    add(`SHARED RANK · ${result.previousRank ? `#${result.previousRank}` : 'UNRANKED'} → ${result.rank ? `#${result.rank}` : 'OUTSIDE TOP 10'}`);
    if (result.rank === 1) add('BEAT #1 · DEFEND YOUR LEAD');
    else if (result.rank) {
      const next = profile.sharedLeaderboard[result.rank - 2];
      if (next) add(`${Math.max(0, next.score - result.personalBestScore! + 1).toLocaleString()} POINTS TO #${result.rank - 1}`);
    } else {
      const first = profile.sharedLeaderboard[0];
      if (first) add(`${Math.max(0, first.score - result.score + 1).toLocaleString()} POINTS TO #1`);
    }
    return panel;
  }
  if (submissionState === 'rejected') add('UNRANKED · LOCAL RESULT ONLY', 'The server could not validate this run transcript.');
  else if (submissionState === 'offline') add('SHARED BOARD OFFLINE · LOCAL RESULT ONLY');
  else add('ADAPTIVE RUN · NOT RANKED');
  if (localBestScore > 0) add(localNewBest ? `NEW LOCAL BEST · ${localPreviousBest.toLocaleString()} → ${localBestScore.toLocaleString()}` : `LOCAL BEST · ${localBestScore.toLocaleString()}`);
  return panel;
}
function renderEnd(): void {
  if (!engine) return;
  const sum = engine.summary();
  const clean = sum.attempted > 0 && sum.correct === sum.attempted;
  clearScene(engine.endReason === 'lives' ? 'HUMAN ERROR DETECTED' : mode === 'practice' ? 'PRACTICE COMPLETE' : 'YOU SURVIVED.', clean ? 'NO NOTES.\nUNFORTUNATELY.' : 'ERRORS\nWERE MADE.', clean ? 'Every completed answer was correct. Yes, every single one.' : 'The machine kept receipts. You can inspect every answer.');
  root.dataset['tone'] = clean ? 'correct' : 'neutral'; pauseButton.hidden = false; pauseButton.textContent = 'Modes';
  const card = element('div', 'result-card');
  card.append(element('span', 'result-status', resultStatus(sum)), element('span', 'bracket', 'CORRECT ANSWERS'), element('div', 'result-ratio', `${sum.correct} / ${sum.attempted}`), element('div', 'result-meta', `${sum.accuracy ?? '—'}% ACCURACY  ·  ${sum.score.toLocaleString()} POINTS`));
  board.append(card);
  board.append(competitionResultPanel());
  const facts = element('p', 'mode-description', `${playerName} · Best streak: ${sum.bestStreak} · ${sum.observed} setup screens excluded · ${sum.cancelled} unfinished excluded`);
  board.append(facts);
  const again = button('AGAIN →', () => { if (!engine) return; engine = null; start(); }, 'button primary');
  const review = button('Answers', () => { reviewIndex = 0; viewKey = ''; render(); }); review.setAttribute('aria-label', 'Review answers');
  const challenge = button('Challenge', share); challenge.setAttribute('aria-label', 'Challenge a friend');
  actions.append(again, review, challenge, button('Leaderboard', leaderboardView));
  narrator.textContent = resultNote || (engine.assisted && mode === 'adaptive' ? 'Paused run. The leaderboard was not updated.' : mode === 'practice' ? 'Practice does not enter the leaderboard.' : mode === 'challenge' ? 'Same seed, same Challenge deck. This score is separate.' : submissionState === 'pending' ? 'Waiting for the server replay. AGAIN is ready when you are.' : submissionState === 'accepted' ? `${playerName}, the server replayed and accepted this Adaptive run.` : submissionState === 'offline' ? 'Shared service unavailable. This result stays local.' : submissionState === 'rejected' ? 'This transcript did not qualify for the shared board.' : clean ? 'I have checked. I cannot blame the scoring this time.' : 'This is a game report, not a personality diagnosis. Mercifully.');
  footerText.textContent = 'See result status above';
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
    completeRun(e);
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
  const score = sum.score.toLocaleString();
  const verifiedRank = submissionState === 'accepted' ? verifiedSubmission?.rank ?? null : null;
  const text = mode === 'challenge'
    ? `I scored ${score} in HUMAN ERROR Challenge (${sum.correct}/${sum.attempted} correct). Same fixed seed, same deck. Think you can beat me?`
    : mode === 'practice'
      ? `I practised HUMAN ERROR: ${sum.correct}/${sum.attempted} correct. Try this fixed-seed Challenge deck. Practice scores are not ranked or comparable.`
      : submissionState === 'accepted'
        ? `I scored ${score} in HUMAN ERROR${verifiedRank ? ` and I'm #${verifiedRank}` : ' and landed outside the shared top 10'}. Think you can beat me? Try my fixed-seed Challenge deck; its score is separate from Adaptive.`
        : `I scored ${score} in HUMAN ERROR in a local, unverified Adaptive run. Think you can beat me? Try my fixed-seed Challenge deck; its score is separate from Adaptive.`;
  try {
    if (link && navigator.share) { await navigator.share({title: 'HUMAN ERROR', text, url: link}); return; }
    if (navigator.clipboard && link) { await navigator.clipboard.writeText(`${text}\n${link}`); resultNote = 'Challenge link copied. Adaptive and fixed-deck Challenge scores are separate.'; viewKey = ''; render(); return; }
  } catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return; }
  clearScene('SHARE HUMAN ERROR', 'THEIR TURN.', 'Fixed-deck challenge. No personal data in the link.');
  const field = element('textarea', 'share-text'); field.readOnly = true; field.setAttribute('aria-label', 'Challenge text');
  field.value = link ? `${text}\n${link}` : `Challenge seed: ${engine.options.seed}. Host this page over HTTPS to share a playable link.`;
  board.append(field); field.focus(); field.select();
  actions.append(button('Back to result', () => { viewKey = ''; render(); }));
}
function exportReceipts(): void {
  if (!engine) return;
  const payload = {game: 'HUMAN ERROR', version: '0.4.0', ruleset: RULESET, playerName, mode, seed: engine.options.seed, assisted: engine.assisted, endReason: engine.endReason, activeMs: Math.round(engine.runElapsed), survivalBonus: engine.endReason === 'time' ? 1000 : 0, summary: engine.summary(), receipts: engine.ledger};
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
  } else if (round.kind === 'counter') {
    if (event.key === ' ') { event.preventDefault(); setCounter(counterValue + 1, round.id); }
    else if (event.key === 'Enter') { event.preventDefault(); answer(round.id, String(counterValue)); }
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
void refreshSharedLeaderboard().then(() => {
  if (root.dataset['phase'] === 'intro' && root.dataset['view']?.endsWith('COMPETITION')) intro();
});
