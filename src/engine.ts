import { Director } from './director.js';
import { makeRound } from './games.js';
import { Mode, Outcome, Phase, Receipt, Round, Summary, Template } from './types.js';

export const RULESET = '2';
export const RUN_BUDGET_MS = 60_000;
export const ARM_MS = 180;
export const MAX_LIVES = 4;
const GRADED: readonly Outcome[] = ['correct', 'wrong', 'timeout'];

export interface EngineOptions {
  readonly seed: string;
  readonly mode: Mode;
  readonly runId: string;
  /** Injected deck/budget only for deterministic tests and embedding. No URL access. */
  readonly deck?: readonly Template[];
  readonly budgetMs?: number;
  readonly practiceLength?: number;
}

/**
 * Referee with no DOM, wall clock, timers, storage, network, or rendering dependencies.
 * The host calls step(deltaMilliseconds) only while the game is visible and running.
 * A round can settle once, and input must carry the round ID it was rendered for.
 */
export class Engine {
  private _phase: Phase = 'ready';
  private _round: Round | null = null;
  private _ledger: Receipt[] = [];
  private _ordinal = -1;
  private _elapsed = 0;
  private _runElapsed = 0;
  private _phaseRemaining = 0;
  private _paused = false;
  private _assisted = false;
  private _streak = 0;
  private _bestStreak = 0;
  private _lives = MAX_LIVES;
  private _score = 0;
  private _endReason: 'lives' | 'time' | 'practice' | null = null;
  private _memory: string | null = null;
  private _reactionPresented = false;
  private _ignored = 0;
  readonly director: Director;
  readonly budgetMs: number;
  constructor(readonly options: EngineOptions) {
    if (!/^[A-Za-z0-9_-]{1,32}$/.test(options.seed)) throw new Error('Invalid seed');
    if (!['adaptive', 'challenge', 'practice'].includes(options.mode)) throw new Error('Invalid mode');
    this.budgetMs = options.budgetMs ?? RUN_BUDGET_MS;
    if (!Number.isFinite(this.budgetMs) || this.budgetMs <= 0) throw new RangeError('Invalid budget');
    this.director = new Director(options.seed, options.mode);
  }
  get phase(): Phase { return this._phase; }
  get round(): Round | null { return this._round; }
  get ledger(): readonly Receipt[] { return this._ledger; }
  get lastReceipt(): Receipt | null { return this._ledger[this._ledger.length - 1] ?? null; }
  get ordinal(): number { return this._ordinal; }
  get elapsed(): number { return this._elapsed; }
  get runElapsed(): number { return this._runElapsed; }
  get runRemaining(): number { return this.options.mode === 'practice' ? Infinity : Math.max(0, this.budgetMs - this._runElapsed); }
  get roundRemaining(): number {
    if (!this._round) return 0;
    return this.isUntimed() ? Infinity : Math.max(0, this._round.duration - this._elapsed);
  }
  get paused(): boolean { return this._paused; }
  get assisted(): boolean { return this._assisted; }
  get streak(): number { return this._streak; }
  get multiplier(): number { return Math.min(4, 1 + Math.floor(Math.max(0, this._streak - 1) / 3)); }
  get lives(): number { return this._lives; }
  get endReason(): 'lives' | 'time' | 'practice' | null { return this._endReason; }
  get ignoredInputs(): number { return this._ignored; }
  get cueDue(): boolean { return !!this._round && this._elapsed >= this._round.cueDelay; }
  get reactionPresented(): boolean { return this._reactionPresented; }

  start(): boolean {
    if (this._phase !== 'ready') return false;
    this.next(); return true;
  }
  pause(): boolean {
    if (this._phase === 'ready' || this._phase === 'finished' || this._paused) return false;
    this._paused = true; this._assisted = true; return true;
  }
  resume(): void { this._paused = false; }
  /** Called by the renderer when GO is placed in the displayed DOM. */
  presentReaction(id: string): void {
    if (id === this._round?.id && this._phase === 'active' && this._round.kind === 'reaction' && this.cueDue && !this._paused) this._reactionPresented = true;
  }
  step(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new RangeError('Time must advance monotonically');
    if (this._paused || this._phase === 'ready' || this._phase === 'finished') return;
    if (this._phase === 'arming') {
      this._phaseRemaining -= deltaMs;
      if (this._phaseRemaining <= 0) this._phase = 'active';
      // Do not debit time before the active state can actually be displayed.
      return;
    }
    if (this._phase === 'feedback') {
      if (this.options.mode === 'practice') return;
      this._phaseRemaining -= deltaMs;
      if (this._phaseRemaining <= 0) this.next();
      return;
    }
    const round = this._round;
    if (!round) throw new Error('Active phase requires a round');
    const untilRound = this.isUntimed() ? Infinity : Math.max(0, round.duration - this._elapsed);
    const untilRun = this.runRemaining;
    const consumed = Math.min(deltaMs, untilRound, untilRun);
    this._elapsed += consumed; this._runElapsed += consumed;
    // Deadline is inclusive for input. A subsequent step past it resolves timeout.
    // If a round and run end together, settle that round first; zero lives wins.
    if (deltaMs > untilRound && untilRound <= untilRun) {
      const outcome: Outcome = round.kind === 'memory' ? 'observed' : (round.kind === 'wait' || round.kind === 'override' ? 'correct' : 'timeout');
      this.settle(outcome, null);
      if (this._lives > 0 && this.runRemaining <= 0 && this._endReason === null) this.finish('time');
      return;
    }
    if (deltaMs > untilRun) {
      this.settle('cancelled', null);
      this.finish('time');
    }
  }
  /** Input is a bounded answer ID or a short literal typed string; never executable. */
  answer(id: string, value: string): boolean {
    const round = this._round;
    if (!round || round.id !== id || this._paused || this._phase !== 'active') { this._ignored++; return false; }
    if (typeof value !== 'string' || value.length > 32) { this._ignored++; return false; }
    if (round.kind === 'memory') { this._ignored++; return false; }
    if (round.kind === 'override' && !this.cueDue) { this._ignored++; return false; }
    let success = false;
    if (round.kind === 'choice') {
      if (!round.options.some(o => o.id === value)) { this._ignored++; return false; }
      success = value === round.correct;
    } else if (round.kind === 'typing') {
      success = value.trim().toUpperCase() === round.correct;
    } else if (round.kind === 'reaction') {
      if (value !== 'go') { this._ignored++; return false; }
      success = this._reactionPresented;
    } else {
      if (value !== 'press') { this._ignored++; return false; }
      success = false;
    }
    this.settle(success ? 'correct' : 'wrong', value);
    return true;
  }
  /** Untimed practice setup/feedback is explicitly advanced, never counted as a win. */
  continuePractice(): boolean {
    if (this.options.mode !== 'practice' || this._paused) return false;
    if (this._phase === 'feedback') { this.next(); return true; }
    if (this._phase === 'active' && this._round?.kind === 'memory') { this.settle('observed', null); return true; }
    return false;
  }
  summary(): Summary {
    const graded = this._ledger.filter(r => GRADED.includes(r.outcome));
    const correct = graded.filter(r => r.outcome === 'correct').length;
    return {
      correct, attempted: graded.length, wrong: graded.length - correct,
      observed: this._ledger.filter(r => r.outcome === 'observed').length,
      cancelled: this._ledger.filter(r => r.outcome === 'cancelled').length,
      accuracy: graded.length ? Math.round(correct / graded.length * 100) : null,
      score: this._score, bestStreak: this._bestStreak
    };
  }
  private isUntimed(): boolean {
    return this.options.mode === 'practice' && !!this._round && !['wait', 'override'].includes(this._round.kind);
  }
  private next(): void {
    if (this._lives <= 0 && this.options.mode !== 'practice') { this.finish('lives'); return; }
    if (this.options.mode === 'practice' && this.summary().attempted >= (this.options.practiceLength ?? 10)) { this.finish('practice'); return; }
    if (this.runRemaining <= 0) { this.finish('time'); return; }
    this._ordinal++;
    let template = this.options.deck?.[this._ordinal % this.options.deck.length] ?? this.director.choose(this._ordinal);
    if (template === 'recall' && this._memory === null) template = 'magnitude';
    const round = makeRound(template, this.options.seed, this._ordinal, `${this.options.runId}:${this._ordinal}`, this._memory);
    if (template === 'remember') this._memory = round.memoryValue;
    // Consume once, regardless of the upcoming verdict, preventing recall loops.
    if (template === 'recall') this._memory = null;
    this._round = round; this._elapsed = 0; this._reactionPresented = false;
    this._phaseRemaining = ARM_MS; this._phase = 'arming';
  }
  private settle(outcome: Outcome, submitted: string | null): void {
    const round = this._round;
    if (!round || this._phase !== 'active') throw new Error('Only active rounds may settle');
    let scoreDelta = 0;
    if (outcome === 'correct') {
      this._streak++; this._bestStreak = Math.max(this._bestStreak, this._streak);
      const speed = this.options.mode === 'practice' || ['wait', 'override'].includes(round.kind) ? 0 : Math.round(100 * Math.max(0, 1 - this._elapsed / round.duration));
      scoreDelta = (100 + speed) * this.multiplier;
      this._score += scoreDelta;
    } else if (outcome === 'wrong' || outcome === 'timeout') {
      this._streak = 0;
      if (this.options.mode !== 'practice') this._lives--;
    }
    const userLabel = submitted === null ? null : round.kind === 'choice'
      ? (round.symbol ? `Shape ${Number(submitted) + 1}` : round.options.find(o => o.id === submitted)!.label.replace('\n', ' — '))
      : submitted;
    const reason = outcome === 'timeout' ? `Time ran out. ${round.explanation}`
      : outcome === 'cancelled' ? 'The run ended during this question. Not graded.'
      : outcome === 'wrong' && round.kind === 'reaction' && !this._reactionPresented ? 'Too early. GO had not appeared yet.'
      : round.explanation;
    const receipt: Receipt = Object.freeze({id: round.id, template: round.template, category: round.category, prompt: round.title, expected: round.expected, submitted: userLabel, explanation: reason, outcome, responseMs: Math.round(this._elapsed), scoreDelta, streak: this._streak, multiplier: this.multiplier});
    this._ledger.push(receipt); this.director.observe(round.category, outcome);
    this._phase = 'feedback'; this._phaseRemaining = outcome === 'wrong' || outcome === 'timeout' ? 1150 : outcome === 'observed' ? 300 : 620;
    if (this._lives <= 0 && this.options.mode !== 'practice') this.finish('lives');
    else if (this.options.mode === 'practice' && this.summary().attempted >= (this.options.practiceLength ?? 10)) this.finish('practice');
  }
  private finish(reason: 'lives' | 'time' | 'practice'): void {
    if (this._phase === 'finished') return;
    if (this._lives <= 0 && this.options.mode !== 'practice') reason = 'lives';
    this._endReason = reason; this._phase = 'finished'; this._paused = false;
    if (reason === 'time' && this._lives > 0) this._score += 1000;
  }
}
