
import { randomBytes } from 'node:crypto';

export const DEFAULT_SESSION_TTL_MS = 10 * 60_000;
export const MAX_LIVE_SESSIONS = 10_000;

/** In-memory, one-use Adaptive sessions. Restarting the server expires every outstanding session. */
export function createRunSessionStore({
  ttlMs = DEFAULT_SESSION_TTL_MS,
  maxSessions = MAX_LIVE_SESSIONS,
  now = Date.now,
  idFactory = () => randomBytes(16).toString('hex'),
  seedFactory = () => randomBytes(16).toString('hex'),
  version = '0.7.0',
  ruleset = '7'
} = {}) {
  if (!Number.isSafeInteger(ttlMs) || ttlMs < 1 || !Number.isSafeInteger(maxSessions) || maxSessions < 1) throw new RangeError('Invalid session-store limits');
  const pending = new Map();
  function prune(time = now()) {
    for (const [id, session] of pending) if (session.expiresAt <= time) pending.delete(id);
  }
  return Object.freeze({
    issue() {
      const issuedAt = now();
      if (!Number.isSafeInteger(issuedAt) || issuedAt < 0 || issuedAt + ttlMs > Number.MAX_SAFE_INTEGER) throw new RangeError('Invalid session clock');
      prune(issuedAt);
      if (pending.size >= maxSessions) {
        const error = new Error('Session capacity reached'); error.code = 'SESSION_CAPACITY'; throw error;
      }
      let id;
      for (let attempt = 0; attempt < 32; attempt++) {
        const candidate = idFactory();
        if (typeof candidate === 'string' && /^[a-f0-9]{32}$/.test(candidate) && !pending.has(candidate)) { id = candidate; break; }
      }
      const seed = seedFactory();
      if (!id || typeof seed !== 'string' || !/^[A-Za-z0-9_-]{1,32}$/.test(seed)) {
        const error = new Error('Secure run token generation failed'); error.code = 'SESSION_CAPACITY'; throw error;
      }
      const session = Object.freeze({id, seed, version, ruleset, issuedAt, expiresAt: issuedAt + ttlMs});
      pending.set(id, session);
      return session;
    },
    consume(id) {
      if (typeof id !== 'string') return null;
      const session = pending.get(id);
      if (!session) return null;
      pending.delete(id);
      return session.expiresAt > now() ? session : null;
    },
    size() { prune(); return pending.size; }
  });
}
