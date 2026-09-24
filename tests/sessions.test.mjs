import test from 'node:test';
import assert from 'node:assert/strict';
import { createRunSessionStore } from '../scripts/sessions.mjs';

test('run sessions are cryptographically shaped, bound to the release, and one use', () => {
  let now = 1000;
  const store = createRunSessionStore({now:() => now, version:'0.7.0', ruleset:'7', idFactory:() => 'a'.repeat(32), seedFactory:() => 'seed-1'});
  const session = store.issue();
  assert.deepEqual(session, {id:'a'.repeat(32), seed:'seed-1', version:'0.7.0', ruleset:'7', issuedAt:1000, expiresAt:601000});
  assert.deepEqual(store.consume(session.id), session);
  assert.equal(store.consume(session.id), null);
  assert.equal(store.size(), 0);
});

test('expired sessions are pruned and cannot be consumed', () => {
  let now = 0;
  const store = createRunSessionStore({ttlMs:20, now:() => now, idFactory:() => 'b'.repeat(32), seedFactory:() => 'seed'});
  const session = store.issue();
  now = session.expiresAt;
  assert.equal(store.consume(session.id), null);
  assert.equal(store.size(), 0);
});

test('session capacity, bad clocks, and repeated token collisions fail closed', () => {
  let n = 0;
  const store = createRunSessionStore({maxSessions:1, idFactory:() => (++n === 1 ? 'c'.repeat(32) : 'c'.repeat(32)), seedFactory:() => 'seed'});
  store.issue();
  assert.throws(() => store.issue(), {code:'SESSION_CAPACITY'});
  const bad = createRunSessionStore({now:() => -1});
  assert.throws(() => bad.issue(), RangeError);
  const collision = createRunSessionStore({idFactory:() => 'not-a-token', seedFactory:() => 'seed'});
  assert.throws(() => collision.issue(), {code:'SESSION_CAPACITY'});
});
