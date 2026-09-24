import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { request as httpRequest } from 'node:http';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARM_MS, FEEDBACK_MS, GAME_VERSION, RULESET, Engine } from '../build/modules/engine.js';
import { replayAdaptiveTranscript } from '../scripts/replay.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
function jsonHeaders(base) { return {'Content-Type':'application/json', 'Origin':new URL(base).origin}; }
async function newDataDirectory(t) {
  const directory = await mkdtemp(join(tmpdir(), 'human-error-http-'));
  t.after(() => rm(directory, {recursive:true, force:true}));
  return directory;
}
async function startServer(dataDirectory) {
  const child = spawn(process.execPath, ['scripts/serve.mjs'], {
    cwd:root,
    env:{...process.env, PORT:'0', HOST:'127.0.0.1', DATA_DIR:dataDirectory},
    stdio:['ignore','pipe','pipe']
  });
  let stderr = '';
  child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
  const base = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Server did not start. ${stderr}`)), 5000);
    child.stdout.setEncoding('utf8').on('data', chunk => {
      const match = chunk.match(/HUMAN ERROR: (http:\/\/127\.0\.0\.1:\d+)/);
      if (match) { clearTimeout(timeout); resolve(match[1]); }
    });
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Server exited ${code}. ${stderr}`)); });
  });
  return {
    child, base,
    async close() {
      if (child.exitCode !== null || child.signalCode !== null) return;
      child.kill('SIGTERM');
      let timer;
      await Promise.race([once(child, 'exit'), new Promise(resolve => { timer = setTimeout(resolve, 6000); })]);
      clearTimeout(timer);
      if (child.exitCode === null && child.signalCode === null) { child.kill('SIGKILL'); throw new Error(`Server failed to stop. ${stderr}`); }
    }
  };
}
async function jsonResponse(base, path, init = {}) {
  const response = await fetch(new URL(path, base), init);
  let body = null;
  const text = await response.text();
  if (text) { try { body = JSON.parse(text); } catch { body = text; } }
  return {response, body};
}
function sessionRequest(base, extra = {}) {
  return {method:'POST', headers:jsonHeaders(base), body:JSON.stringify({ruleset:RULESET, version:GAME_VERSION, ...extra})};
}
function submissionRequest(base, session, name = 'Launch Tester', extra = {}, events = []) {
  return {
    method:'POST', headers:jsonHeaders(base),
    body:JSON.stringify({ruleset:session.ruleset, version:session.version, name, events, ...extra})
  };
}
function playToLives(seed, runId) {
  const engine = new Engine({seed, mode:'adaptive', runId});
  const events = [];
  let minimumElapsedMs = 0;
  engine.start();
  let transitions = 0;
  while (engine.phase !== 'finished' && transitions++ < 100) {
    if (engine.phase === 'arming') { minimumElapsedMs += ARM_MS; engine.step(ARM_MS); continue; }
    if (engine.phase === 'feedback') { const duration = FEEDBACK_MS[engine.lastReceipt.outcome]; minimumElapsedMs += duration; engine.step(duration); continue; }
    const round = engine.round;
    assert.ok(round);
    if (round.kind === 'memory') {
      const before = engine.runElapsed; engine.step(round.duration + 1); minimumElapsedMs += engine.runElapsed - before; continue;
    }
    let elapsedMs = 3.125, value = '?';
    if (round.kind === 'choice') value = round.options.find(option => option.id !== round.correct).id;
    else if (round.kind === 'counter') value = String((Number(round.correct) + 1) % 100);
    else if (round.kind === 'wait') value = 'press';
    else if (round.kind === 'override') { elapsedMs = round.cueDelay; value = 'press'; }
    else if (round.kind === 'reaction') {
      if (round.cueDelay <= 0) { engine.step(round.duration + 1); continue; }
      elapsedMs = Number(Math.max(0, round.cueDelay - 1.25).toFixed(3)); value = 'go';
    }
    const before = engine.runElapsed; engine.step(elapsedMs); minimumElapsedMs += engine.runElapsed - before;
    if (round.kind === 'override') engine.presentOverride(round.id);
    assert.equal(engine.answer(round.id, value), true, `accepted deliberate miss for ${round.kind}`);
    events.push({roundId:round.id, elapsedMs, value, reactionPresented:false, overridePresented:round.kind === 'override'});
  }
  assert.equal(engine.endReason, 'lives');
  return {events, activeMs:Math.round(engine.runElapsed), minimumElapsedMs:Math.round(minimumElapsedMs)};
}
function wait(milliseconds) { return new Promise(resolve => setTimeout(resolve, milliseconds)); }

async function oversizedChunkedRequest(base, path) {
  return await new Promise((resolve, reject) => {
    const target = new URL(path, base);
    const started = performance.now();
    const request = httpRequest(target, {
      method:'POST',
      headers:{'Content-Type':'application/json', Origin:new URL(base).origin}
    }, response => {
      response.resume();
      response.once('end', () => {
        clearTimeout(timeout);
        resolve({
          status: response.statusCode,
          elapsedMs: performance.now() - started,
          connection: response.headers.connection
        });
      });
    });
    request.once('error', reject);
    const timeout = setTimeout(() => {
      request.destroy(new Error('Server did not reject oversized streaming body promptly'));
    }, 2000);
    request.write('{"payload":"');
    const chunk = 'x'.repeat(8192);
    for (let index = 0; index < 9; index++) request.write(chunk);
    // Deliberately do not end the request. The server must reject once the byte cap is crossed.
  });
}

test('oversized chunked bodies are rejected before EOF and close the connection', async t => {
  const directory = await newDataDirectory(t);
  const server = await startServer(directory); t.after(() => server.close());
  const result = await oversizedChunkedRequest(server.base, '/api/run-sessions');
  assert.equal(result.status, 413);
  assert.equal(result.connection, 'close');
  assert.ok(result.elapsedMs < 1500, `oversized body rejection took ${result.elapsedMs.toFixed(1)}ms`);
});

test('HTTP service accepts only one-use replay submissions and persists their server-computed results', async t => {
  const directory = await newDataDirectory(t);
  let server = await startServer(directory); t.after(() => server?.close());
  let base = server.base;
  const health = await jsonResponse(base, '/api/health');
  assert.equal(health.response.status, 200);
  assert.equal(health.body.ruleset, RULESET);
  const empty = await jsonResponse(base, '/api/leaderboard');
  assert.deepEqual(empty.body, {leaderboard:[]});
  assert.equal(empty.response.headers.get('access-control-allow-origin'), null);
  assert.equal((await jsonResponse(base, '/api/leaderboard', {method:'POST'})).response.status, 405);
  assert.equal((await jsonResponse(base, '/api/run-sessions', sessionRequest(base, {version:'0.3.0'}))).response.status, 409);
  assert.equal((await jsonResponse(base, '/api/run-sessions', {...sessionRequest(base), headers:{...jsonHeaders(base), Origin:'https://attacker.invalid'}})).response.status, 403);
  assert.equal((await jsonResponse(base, '/api/run-sessions', {method:'POST', headers:{...jsonHeaders(base), 'Content-Type':'text/plain'}, body:'{}'})).response.status, 415);

  const tooFast = (await jsonResponse(base, '/api/run-sessions', sessionRequest(base))).body;
  const tooFastResponse = await jsonResponse(base, `/api/run-sessions/${tooFast.id}/submit`, submissionRequest(base, tooFast, 'Too Fast'));
  assert.equal(tooFastResponse.response.status, 422);

  const issued = await jsonResponse(base, '/api/run-sessions', sessionRequest(base));
  assert.equal(issued.response.status, 201);
  assert.match(issued.body.id, /^[a-f0-9]{32}$/);
  assert.match(issued.body.seed, /^[A-Za-z0-9_-]{1,32}$/);
  const played = playToLives(issued.body.seed, issued.body.id);
  const expected = replayAdaptiveTranscript({seed:issued.body.seed, runId:issued.body.id, events:played.events});
  await wait(expected.minimumElapsedMs + 25);
  const submitted = await jsonResponse(base, `/api/run-sessions/${issued.body.id}/submit`, submissionRequest(base, issued.body, 'Launch Tester', {}, played.events));
  assert.equal(submitted.response.status, 200, JSON.stringify(submitted.body));
  assert.equal(submitted.body.validation, 'server-replayed');
  assert.equal(submitted.body.score, expected.score);
  assert.equal(submitted.body.correct, expected.correct);
  assert.equal(submitted.body.attempted, expected.attempted);
  assert.equal(submitted.body.endReason, expected.endReason);
  assert.equal(submitted.body.rank, 1);
  assert.equal(submitted.body.newPersonalBest, true);
  assert.equal((await jsonResponse(base, `/api/run-sessions/${issued.body.id}/submit`, submissionRequest(base, issued.body))).response.status, 410);
  assert.equal((await jsonResponse(base, '/api/leaderboard')).body.leaderboard[0].name, 'Launch Tester');

  const forgedSession = (await jsonResponse(base, '/api/run-sessions', sessionRequest(base))).body;
  const forged = await jsonResponse(base, `/api/run-sessions/${forgedSession.id}/submit`, submissionRequest(base, forgedSession, 'Forged', {score:999999}));
  assert.equal(forged.response.status, 400);
  const forgedPlayed = playToLives(forgedSession.seed, forgedSession.id);
  const forgedExpected = replayAdaptiveTranscript({seed:forgedSession.seed, runId:forgedSession.id, events:forgedPlayed.events});
  await wait(Math.max(0, forgedExpected.minimumElapsedMs - (Date.now() - forgedSession.issuedAt) + 25));
  const forgedRetry = await jsonResponse(base, `/api/run-sessions/${forgedSession.id}/submit`, submissionRequest(base, forgedSession, 'Launch Tester', {}, forgedPlayed.events));
  assert.equal(forgedRetry.response.status, 200, JSON.stringify(forgedRetry.body));
  assert.equal((await jsonResponse(base, `/api/run-sessions/${forgedSession.id}/submit`, submissionRequest(base, forgedSession))).response.status, 410);

  const malformedSession = (await jsonResponse(base, '/api/run-sessions', sessionRequest(base))).body;
  const malformed = await jsonResponse(base, `/api/run-sessions/${malformedSession.id}/submit`, {method:'POST', headers:jsonHeaders(base), body:'{' });
  assert.equal(malformed.response.status, 400);
  assert.equal((await jsonResponse(base, `/api/run-sessions/${malformedSession.id}/submit`, submissionRequest(base, malformedSession))).response.status, 422);
  const largeSession = (await jsonResponse(base, '/api/run-sessions', sessionRequest(base))).body;
  const large = await jsonResponse(base, `/api/run-sessions/${largeSession.id}/submit`, {method:'POST', headers:jsonHeaders(base), body:JSON.stringify({payload:'x'.repeat(66_000)})});
  assert.equal(large.response.status, 413);
  assert.equal((await jsonResponse(base, `/api/run-sessions/${largeSession.id}/submit`, submissionRequest(base, largeSession))).response.status, 422);
  const nameSession = (await jsonResponse(base, '/api/run-sessions', sessionRequest(base))).body;
  const invalidName = await jsonResponse(base, `/api/run-sessions/${nameSession.id}/submit`, submissionRequest(base, nameSession, '\u202e\u200b'));
  assert.equal(invalidName.response.status, 400);
  assert.equal((await jsonResponse(base, `/api/run-sessions/${nameSession.id}/submit`, submissionRequest(base, nameSession))).response.status, 422);

  const versionSession = (await jsonResponse(base, '/api/run-sessions', sessionRequest(base))).body;
  const wrongVersion = await jsonResponse(base, `/api/run-sessions/${versionSession.id}/submit`, submissionRequest(base, versionSession, 'Launch Tester', {version:'0.3.0'}));
  assert.equal(wrongVersion.response.status, 409);
  assert.equal((await jsonResponse(base, `/api/run-sessions/${versionSession.id}/submit`, submissionRequest(base, versionSession))).response.status, 422);

  const restartSession = (await jsonResponse(base, '/api/run-sessions', sessionRequest(base))).body;
  await server.close(); server = null;
  server = await startServer(directory); base = server.base;
  assert.equal((await jsonResponse(base, `/api/run-sessions/${restartSession.id}/submit`, submissionRequest(base, restartSession))).response.status, 410);
  const afterRestart = await jsonResponse(base, '/api/leaderboard');
  assert.equal(afterRestart.body.leaderboard.length, 1);
  assert.equal(afterRestart.body.leaderboard[0].name, 'Launch Tester');
  assert.equal(afterRestart.body.leaderboard[0].recordedAt > 0, true);
});

test('Challenge, Practice, and assisted declarations cannot create or submit ranked Adaptive runs', async t => {
  const directory = await newDataDirectory(t);
  const server = await startServer(directory); t.after(() => server.close());
  const base = server.base;
  for (const mode of ['challenge', 'practice']) {
    const response = await jsonResponse(base, '/api/run-sessions', sessionRequest(base, {mode}));
    assert.equal(response.response.status, 409);
  }
  const assistedDeclaration = await jsonResponse(base, '/api/run-sessions', sessionRequest(base, {assisted:true}));
  assert.equal(assistedDeclaration.response.status, 409);
  for (const extra of [{mode:'challenge'}, {mode:'practice'}, {assisted:true}]) {
    const issued = await jsonResponse(base, '/api/run-sessions', sessionRequest(base));
    assert.equal(issued.response.status, 201);
    const rejected = await jsonResponse(base, `/api/run-sessions/${issued.body.id}/submit`, submissionRequest(base, issued.body, 'Unranked Attempt', extra));
    assert.equal(rejected.response.status, 400);
  }
  assert.deepEqual((await jsonResponse(base, '/api/leaderboard')).body, {leaderboard:[]});
});

test('independent server instances serialize concurrent writes to one persistent leaderboard', async t => {
  const directory = await newDataDirectory(t);
  const servers = await Promise.all([startServer(directory), startServer(directory)]);
  t.after(async () => { await Promise.all(servers.map(server => server.close())); });
  const attempts = await Promise.all(Array.from({length:12}, async (_, index) => {
    const server = servers[index % 2];
    const issued = await jsonResponse(server.base, '/api/run-sessions', sessionRequest(server.base));
    assert.equal(issued.response.status, 201);
    const played = playToLives(issued.body.seed, issued.body.id);
    return {server, session:issued.body, played};
  }));
  const maxWait = Math.max(...attempts.map(({session, played}) => Math.max(0, played.minimumElapsedMs - (Date.now() - session.issuedAt) + 25)));
  await wait(maxWait);
  const submissions = await Promise.all(attempts.map(({server, session, played}, index) => jsonResponse(server.base, `/api/run-sessions/${session.id}/submit`, submissionRequest(server.base, session, `Concurrent ${index}`, {}, played.events))));
  assert.ok(submissions.every(item => item.response.status === 200), submissions.map(item => `${item.response.status}:${JSON.stringify(item.body)}`).join('\n'));
  const final = await jsonResponse(servers[0].base, '/api/leaderboard');
  assert.equal(final.body.leaderboard.length, 10);
  assert.equal(new Set(final.body.leaderboard.map(entry => entry.name.toLowerCase())).size, 10);
});

test('health responds promptly without touching locked leaderboard storage', async t => {
  const directory = await newDataDirectory(t);
  const server = await startServer(directory); t.after(() => server.close());
  const owner = JSON.stringify({pid:process.pid, createdAt:Date.now()});
  await writeFile(join(directory, 'leaderboard.lock'), owner);
  const started = performance.now();
  const health = await jsonResponse(server.base, '/api/health', {signal:AbortSignal.timeout(2000)});
  assert.equal(health.response.status, 200);
  assert.deepEqual(health.body, {status:'ok', ruleset:RULESET});
  assert.ok(performance.now() - started < 2000, 'health must not wait for the storage lock');
  assert.equal(await readFile(join(directory, 'leaderboard.lock'), 'utf8'), owner);
  assert.deepEqual(await readdir(directory), ['leaderboard.lock']);
});

test('per-route session issue limits return retry guidance', async t => {
  const directory = await newDataDirectory(t);
  const server = await startServer(directory); t.after(() => server.close());
  for (let i = 0; i < 30; i++) assert.equal((await jsonResponse(server.base, '/api/run-sessions', sessionRequest(server.base))).response.status, 201);
  const blocked = await jsonResponse(server.base, '/api/run-sessions', sessionRequest(server.base));
  assert.equal(blocked.response.status, 429);
  assert.match(blocked.response.headers.get('retry-after') ?? '', /^\d+$/);
});
