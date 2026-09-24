import test from 'node:test';
import assert from 'node:assert/strict';
import { Engine, ARM_MS } from '../build/modules/engine.js';
import { MAX_TRANSCRIPT_EVENTS, replayAdaptiveTranscript } from '../scripts/replay.mjs';

function playToFinish(seed, runId) {
  const engine = new Engine({seed, mode:'adaptive', runId});
  const events = [];
  const wrongEvents = [];
  engine.start();
  let transitions = 0;
  while (engine.phase !== 'finished' && transitions++ < 2000) {
    if (engine.phase === 'arming') { engine.step(ARM_MS); continue; }
    if (engine.phase === 'feedback') { engine.step(5000); continue; }
    const round = engine.round;
    assert.ok(round, 'active referee state has a round');
    if (round.kind === 'memory' || round.kind === 'wait' || round.kind === 'override') {
      engine.step(round.duration + 1);
      continue;
    }
    let elapsedMs = 1000, value = round.correct, reactionPresented = false;
    if (round.kind === 'reaction') {
      elapsedMs = Number((round.cueDelay + 1.25).toFixed(3));
      value = 'go';
    }
    if (engine.runRemaining <= elapsedMs) {
      engine.step(engine.runRemaining + 1);
      continue;
    }
    engine.step(elapsedMs);
    if (round.kind === 'reaction') { engine.presentReaction(round.id); reactionPresented = true; }
    assert.equal(engine.answer(round.id, value), true, `accepted ${round.kind}`);
    events.push({roundId:round.id, elapsedMs, value, reactionPresented, overridePresented:false});
    let wrongValue = '?';
    let wrongElapsed = elapsedMs;
    if (round.kind === 'choice') wrongValue = round.options.find(option => option.id !== value).id;
    if (round.kind === 'counter') wrongValue = String((Number(round.correct) + 1) % 100);
    if (round.kind === 'reaction') { wrongValue = 'go'; wrongElapsed = 0; }
    wrongEvents.push({roundId:round.id, elapsedMs:wrongElapsed, value:wrongValue, reactionPresented:false, overridePresented:false});
  }
  assert.equal(engine.phase, 'finished');
  return {events, wrongEvents, summary:engine.summary(), endReason:engine.endReason, activeMs:Math.round(engine.runElapsed)};
}

test('the server replay reproduces exact adaptive scores and receipts from the compiled referee', () => {
  const runId = '0123456789abcdef0123456789abcdef';
  const played = playToFinish('replay-fixed-seed', runId);
  const replayed = replayAdaptiveTranscript({seed:'replay-fixed-seed', runId, events:played.events});
  assert.equal(replayed.score, played.summary.score);
  assert.equal(replayed.correct, played.summary.correct);
  assert.equal(replayed.attempted, played.summary.attempted);
  assert.equal(replayed.bestStreak, played.summary.bestStreak);
  assert.equal(replayed.endReason, played.endReason);
  assert.equal(replayed.activeMs, played.activeMs);
  assert.ok(played.events.length > 0 && played.events.length < MAX_TRANSCRIPT_EVENTS);
});

test('replay rejects forged, malformed, out-of-order, and unbounded actions', () => {
  const runId = '0123456789abcdef0123456789abcdef';
  const played = playToFinish('replay-validation', runId);
  const valid = played.events;
  assert.ok(valid.length >= 2);
  assert.throws(() => replayAdaptiveTranscript({seed:'replay-validation', runId, events:[{...valid[0], score:999}]}), {code:'INVALID_TRANSCRIPT'});
  assert.throws(() => replayAdaptiveTranscript({seed:'replay-validation', runId, events:[{...valid[0], roundId:'other:0'}]}), {code:'INVALID_TRANSCRIPT'});
  assert.throws(() => replayAdaptiveTranscript({seed:'replay-validation', runId, events:[valid[1], valid[0]]}), {code:'INVALID_TRANSCRIPT'});
  assert.throws(() => replayAdaptiveTranscript({seed:'replay-validation', runId, events:[{...valid[0], elapsedMs:1.0001}]}), {code:'INVALID_TRANSCRIPT'});
  assert.throws(() => replayAdaptiveTranscript({seed:'replay-validation', runId, events:Array(MAX_TRANSCRIPT_EVENTS + 1).fill(valid[0])}), {code:'INVALID_TRANSCRIPT'});
  assert.throws(() => replayAdaptiveTranscript({seed:'replay-validation', runId, events:[{roundId:`${runId}:0`, elapsedMs:0, value:'x'.repeat(33)}]}), {code:'INVALID_TRANSCRIPT'});
});

test('changing an accepted answer changes only the result recomputed by the referee', () => {
  const runId = '0123456789abcdef0123456789abcdef';
  const played = playToFinish('replay-tamper', runId);
  const forged = [played.wrongEvents[0]];
  const baseline = replayAdaptiveTranscript({seed:'replay-tamper', runId, events:played.events});
  const changed = replayAdaptiveTranscript({seed:'replay-tamper', runId, events:forged});
  assert.ok(changed.score <= baseline.score);
  assert.ok(changed.correct <= baseline.correct);
});
