import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLeaderboardStore } from '../scripts/leaderboard-store.mjs';

async function temporaryDirectory() { return mkdtemp(join(tmpdir(), 'human-error-board-')); }
function submission(name, score, recordedAt = 1) { return {name, score, correct:1, attempted:1, bestStreak:1, recordedAt}; }

test('shared board stores server timestamps, one best per normalized display name, and the top ten', async t => {
  const directory = await temporaryDirectory(); t.after(() => rm(directory, {recursive:true, force:true}));
  let now = 100;
  const store = createLeaderboardStore(directory, {now:() => now});
  const first = await store.record(submission(' Alice ', 10, 999999));
  assert.equal(first.recordedAt, 100);
  assert.equal(first.newPersonalBest, true);
  now = 101;
  const repeat = await store.record(submission('alice', 9));
  assert.equal(repeat.previousBestScore, 10);
  assert.equal(repeat.personalBestScore, 10);
  assert.equal(repeat.rank, 1);
  assert.equal(repeat.leaderboard.length, 1);
  for (let i = 0; i < 12; i++) await store.record(submission(`Player ${i}`, 20 - i));
  const rows = await store.read();
  assert.equal(rows.length, 10);
  assert.equal(rows[0].score, 20);
  assert.equal(rows.some(row => row.name.toLowerCase() === 'alice'), false);
});

test('independent store instances serialize concurrent writes without losing entries', async t => {
  const directory = await temporaryDirectory(); t.after(() => rm(directory, {recursive:true, force:true}));
  const stores = Array.from({length:3}, () => createLeaderboardStore(directory));
  await Promise.all(Array.from({length:30}, (_, i) => stores[i % stores.length].record(submission(`Writer ${i}`, 1000 - i))));
  const rows = await stores[0].read();
  assert.equal(rows.length, 10);
  assert.equal(rows[0].score, 1000);
  const persisted = JSON.parse(await readFile(join(directory, 'leaderboard.json'), 'utf8'));
  assert.equal(persisted.leaderboard.length, 30);
  assert.equal((await readdir(directory)).some(name => name.startsWith('leaderboard.tmp-')), false);
});

test('a display name keeps its personal best after it falls outside the public top ten', async t => {
  const directory = await temporaryDirectory(); t.after(() => rm(directory, {recursive:true, force:true}));
  let now = 1;
  const store = createLeaderboardStore(directory, {now:() => now++});
  await store.record(submission('Returning Player', 50));
  for (let i = 0; i < 12; i++) await store.record(submission(`Higher ${i}`, 60 + i));
  const returnRun = await store.record(submission('returning player', 45));
  assert.equal(returnRun.rank, null);
  assert.equal(returnRun.previousRank, null);
  assert.equal(returnRun.previousBestScore, 50);
  assert.equal(returnRun.personalBestScore, 50);
  assert.equal(returnRun.newPersonalBest, false);
  assert.equal(returnRun.leaderboard.length, 10);
});

test('corrupt persistence is quarantined without destroying its original bytes', async t => {
  const directory = await temporaryDirectory(); t.after(() => rm(directory, {recursive:true, force:true}));
  const original = '{broken-but-preserved';
  await writeFile(join(directory, 'leaderboard.json'), original);
  const store = createLeaderboardStore(directory);
  assert.deepEqual(await store.read(), []);
  assert.match(store.warning(), /quarantined/);
  const backupName = (await readdir(directory)).find(name => name.startsWith('leaderboard.corrupt-'));
  assert.ok(backupName);
  assert.equal(await readFile(join(directory, backupName), 'utf8'), original);
  assert.equal((await store.record(submission('Recovered', 5))).rank, 1);
});

test('invalid scores and names are refused before persistence', async t => {
  const directory = await temporaryDirectory(); t.after(() => rm(directory, {recursive:true, force:true}));
  const store = createLeaderboardStore(directory);
  await assert.rejects(store.record(submission('\u202e\u200b', 10)), {code:'INVALID_SCORE'});
  await assert.rejects(store.record(submission('Valid', 2_000_001)), {code:'INVALID_SCORE'});
  assert.deepEqual(await store.read(), []);
});
