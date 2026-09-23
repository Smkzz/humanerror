import { ARM_MS, Engine, FEEDBACK_MS, RULESET, RUN_BUDGET_MS } from '../build/modules/engine.js';

export const MAX_TRANSCRIPT_EVENTS = 512;
const MAX_REPLAY_ROUNDS = 2000;
const MAX_ACTION_VALUE_LENGTH = 32;

function invalid(message) {
  const error = new Error(message);
  error.code = 'INVALID_TRANSCRIPT';
  return error;
}

function actionOrdinal(action, runId) {
  if (typeof action !== 'object' || action === null || Array.isArray(action)) throw invalid('Action must be an object');
  const keys = Object.keys(action);
  if (keys.length !== 5 || !keys.includes('roundId') || !keys.includes('elapsedMs') || !keys.includes('value') || !keys.includes('reactionPresented') || !keys.includes('overridePresented')) throw invalid('Unexpected action fields');
  if (typeof action.roundId !== 'string' || action.roundId.length > 96 || !action.roundId.startsWith(`${runId}:`)) throw invalid('Wrong run or round ID');
  const ordinalText = action.roundId.slice(runId.length + 1);
  if (!/^(0|[1-9]\d{0,3})$/.test(ordinalText)) throw invalid('Invalid round ordinal');
  const ordinal = Number(ordinalText);
  if (ordinal >= MAX_REPLAY_ROUNDS) throw invalid('Round ordinal limit exceeded');
  if (typeof action.elapsedMs !== 'number' || !Number.isFinite(action.elapsedMs) || action.elapsedMs < 0 || action.elapsedMs > RUN_BUDGET_MS || Number(action.elapsedMs.toFixed(3)) !== action.elapsedMs) throw invalid('Invalid action timing');
  if (typeof action.value !== 'string' || action.value.length > MAX_ACTION_VALUE_LENGTH) throw invalid('Invalid action value');
  if (typeof action.reactionPresented !== 'boolean' || typeof action.overridePresented !== 'boolean') throw invalid('Invalid presentation receipt');
  return ordinal;
}

/** Replays client input through the exact compiled game referee used by the browser. */
export function replayAdaptiveTranscript({seed, runId, events}) {
  if (RULESET !== '4') throw new Error('Verifier ruleset is not the launch ruleset');
  if (typeof seed !== 'string' || !/^[A-Za-z0-9_-]{1,32}$/.test(seed)) throw invalid('Invalid seed');
  if (typeof runId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(runId)) throw invalid('Invalid run ID');
  if (!Array.isArray(events) || events.length > MAX_TRANSCRIPT_EVENTS) throw invalid('Transcript length limit exceeded');

  let priorOrdinal = -1;
  const actions = events.map(action => {
    const ordinal = actionOrdinal(action, runId);
    if (ordinal <= priorOrdinal) throw invalid('Actions must be in strictly increasing round order');
    priorOrdinal = ordinal;
    return {action, ordinal};
  });

  const engine = new Engine({seed, mode: 'adaptive', runId});
  engine.start();
  let actionIndex = 0, transitions = 0, minimumElapsedMs = 0;
  function advanceActive(deltaMs) {
    const before = engine.runElapsed;
    engine.step(deltaMs);
    minimumElapsedMs += engine.runElapsed - before;
  }
  while (engine.phase !== 'finished') {
    if (++transitions > MAX_REPLAY_ROUNDS * 3) throw invalid('Replay transition limit exceeded');
    if (engine.phase === 'arming') {
      minimumElapsedMs += ARM_MS;
      engine.step(ARM_MS);
      continue;
    }
    if (engine.phase === 'feedback') {
      const feedback = FEEDBACK_MS[engine.lastReceipt?.outcome ?? 'correct'];
      minimumElapsedMs += feedback;
      engine.step(feedback);
      continue;
    }
    if (engine.phase !== 'active' || !engine.round) throw invalid('Impossible game state');

    const round = engine.round;
    const next = actions[actionIndex];
    if (round.kind === 'memory') {
      if (next && next.ordinal <= engine.ordinal) throw invalid('Setup rounds cannot contain player answers');
      advanceActive(round.duration + 1);
      continue;
    }
    if (next && next.ordinal < engine.ordinal) throw invalid('Action was skipped or duplicated');
    if (!next || next.ordinal > engine.ordinal) {
      // Missing answers replay as ordinary timeouts or as the deterministic wait outcome.
      advanceActive(round.duration + 1);
      continue;
    }

    const {action} = next;
    if (action.roundId !== round.id || action.elapsedMs > round.duration) throw invalid('Action does not fit the generated round');
    advanceActive(action.elapsedMs);
    if (engine.phase !== 'active') throw invalid('Action arrived after the round or run ended');
    if (round.kind === 'reaction' && action.reactionPresented) {
      if (!engine.cueDue || action.overridePresented) throw invalid('Reaction presentation occurred before its cue');
      engine.presentReaction(round.id);
    } else if (action.reactionPresented) throw invalid('Reaction presentation receipt belongs to the wrong round');
    if (round.kind === 'override' && action.overridePresented) {
      if (!engine.cueDue || action.reactionPresented) throw invalid('Override presentation occurred before its cue');
      engine.presentOverride(round.id);
    } else if (action.overridePresented) throw invalid('Override presentation receipt belongs to the wrong round');
    if (!engine.answer(round.id, action.value)) throw invalid('Action is not accepted by the referee');
    actionIndex++;
  }
  if (actionIndex !== actions.length) throw invalid('Transcript contains actions after the run ended');
  if (engine.options.mode !== 'adaptive' || engine.assisted || !['time', 'lives'].includes(engine.endReason)) throw invalid('Run is not leaderboard eligible');
  const summary = engine.summary();
  if (summary.attempted < 1 || summary.attempted > 500 || summary.correct > summary.attempted || summary.score > 2_000_000) throw invalid('Impossible computed result');
  return Object.freeze({
    score: summary.score,
    correct: summary.correct,
    attempted: summary.attempted,
    bestStreak: summary.bestStreak,
    endReason: engine.endReason,
    activeMs: Math.round(engine.runElapsed),
    minimumElapsedMs: Math.round(minimumElapsedMs)
  });
}
