import { randomBytes } from 'node:crypto';
import { open, readFile, mkdir, rename, stat, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { sanitizePlayerName } from '../build/modules/profile.js';

export const MAX_SCORE = 2_000_000;
export const MAX_ATTEMPTS = 500;
export const MAX_PERSISTED_BYTES = 64 * 1024;
const MAX_PERSISTED_ROWS = 100;
const LOCK_STALE_MS = 5000;
const LOCK_WAIT_MS = 8000;
const MAX_PENDING_OPERATIONS = 64;

function errorWithCode(code, message = code) {
  const error = new Error(message); error.code = code; return error;
}

function validEntry(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const name = typeof value.name === 'string' ? sanitizePlayerName(value.name) : '';
  const {score, correct, attempted, bestStreak, recordedAt} = value;
  if (!name || !Number.isSafeInteger(score) || score < 0 || score > MAX_SCORE) return null;
  if (!Number.isSafeInteger(correct) || correct < 0 || correct > MAX_ATTEMPTS) return null;
  if (!Number.isSafeInteger(attempted) || attempted < correct || attempted > MAX_ATTEMPTS) return null;
  if (!Number.isSafeInteger(bestStreak) || bestStreak < 0 || bestStreak > correct) return null;
  if (!Number.isSafeInteger(recordedAt) || recordedAt < 0 || recordedAt > 4_102_444_800_000) return null;
  return Object.freeze({name, score, correct, attempted, bestStreak, recordedAt});
}

function validPersistedEntry(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const expected = ['name', 'score', 'correct', 'attempted', 'bestStreak', 'recordedAt'];
  const keys = Object.keys(value);
  if (keys.length !== expected.length || !expected.every(key => Object.hasOwn(value, key))) return null;
  const entry = validEntry(value);
  return entry && entry.name === value.name ? entry : null;
}

function compare(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  const accuracy = b.correct * a.attempted - a.correct * b.attempted;
  if (accuracy !== 0) return accuracy;
  if (b.bestStreak !== a.bestStreak) return b.bestStreak - a.bestStreak;
  return a.recordedAt - b.recordedAt;
}

function nameKey(name) { return sanitizePlayerName(name).toLowerCase(); }

function merge(entries) {
  const byName = new Map();
  for (const raw of entries) {
    const entry = validEntry(raw);
    if (!entry) continue;
    const key = nameKey(entry.name), previous = byName.get(key);
    if (!previous || compare(entry, previous) < 0) byName.set(key, entry);
  }
  return [...byName.values()].sort(compare).slice(0, MAX_PERSISTED_ROWS);
}

function rankOf(entries, name) {
  const key = nameKey(name);
  const index = entries.findIndex(entry => nameKey(entry.name) === key);
  return index < 0 ? null : index + 1;
}

function bestOf(entries, name) {
  const key = nameKey(name);
  return entries.find(entry => nameKey(entry.name) === key) ?? null;
}

function processIsAlive(pid) {
  if (!Number.isSafeInteger(pid) || pid < 1) return false;
  try { process.kill(pid, 0); return true; }
  catch (error) { return error?.code === 'EPERM'; }
}

async function removeStaleLock(lockFile) {
  let before;
  try { before = await stat(lockFile); }
  catch (error) { return error?.code === 'ENOENT'; }
  if (Date.now() - before.mtimeMs < LOCK_STALE_MS) return false;
  let owner = null;
  try { owner = JSON.parse(await readFile(lockFile, 'utf8')); } catch { /* A partial lock is stale after the age threshold. */ }
  if (owner && processIsAlive(owner.pid)) return false;
  let current;
  try { current = await stat(lockFile); }
  catch (error) { return error?.code === 'ENOENT'; }
  if (current.dev !== before.dev || current.ino !== before.ino || current.mtimeMs !== before.mtimeMs) return false;
  try { await unlink(lockFile); return true; }
  catch (error) { return error?.code === 'ENOENT'; }
}

async function acquireLock(lockFile, deadline) {
  const owner = JSON.stringify({pid: process.pid, nonce: randomBytes(8).toString('hex'), createdAt: Date.now()});
  while (Date.now() < deadline) {
    let handle;
    try {
      handle = await open(lockFile, 'wx', 0o600);
      await handle.writeFile(owner, 'utf8');
      await handle.sync();
      const identity = await handle.stat();
      await handle.close(); handle = null;
      return async () => {
        try {
          const current = await stat(lockFile);
          if (current.dev !== identity.dev || current.ino !== identity.ino || await readFile(lockFile, 'utf8') !== owner) return;
          await unlink(lockFile);
        } catch (error) { if (error?.code !== 'ENOENT') throw error; }
      };
    } catch (error) {
      if (handle) { await handle.close().catch(() => {}); await unlink(lockFile).catch(() => {}); }
      if (error?.code !== 'EEXIST') throw error;
      if (await removeStaleLock(lockFile)) continue;
      await new Promise(resolveDelay => setTimeout(resolveDelay, 20));
    }
  }
  throw errorWithCode('STORE_BUSY', 'Leaderboard storage lock timed out');
}

async function syncDirectory(path) {
  let handle;
  try {
    handle = await open(path, 'r');
    await handle.sync();
  } catch (error) {
    // Windows does not allow opening directories as file handles; the rename remains atomic.
    if (!['EINVAL', 'EISDIR', 'EPERM', 'EACCES', 'EBADF'].includes(error?.code)) throw error;
  } finally {
    await handle?.close().catch(() => {});
  }
}

export function createLeaderboardStore(dataDirectory, {now = Date.now, maxPendingOperations = MAX_PENDING_OPERATIONS, queueWaitMs = LOCK_WAIT_MS} = {}) {
  const dataDir = resolve(dataDirectory);
  const file = join(dataDir, 'leaderboard.json');
  const lockFile = join(dataDir, 'leaderboard.lock');
  const pendingLimit = Number.isSafeInteger(maxPendingOperations) && maxPendingOperations > 0 && maxPendingOperations <= MAX_PENDING_OPERATIONS ? maxPendingOperations : MAX_PENDING_OPERATIONS;
  const waitMs = Number.isSafeInteger(queueWaitMs) && queueWaitMs >= 50 && queueWaitMs <= LOCK_WAIT_MS ? queueWaitMs : LOCK_WAIT_MS;
  let queue = Promise.resolve();
  let pending = 0;
  let warning = null;

  function locked(operation) {
    if (pending >= pendingLimit) return Promise.reject(errorWithCode('STORE_BUSY', 'Leaderboard storage queue is full'));
    pending += 1;
    const deadline = Date.now() + waitMs;
    const current = queue.then(async () => {
      if (Date.now() >= deadline) throw errorWithCode('STORE_BUSY', 'Leaderboard storage request timed out in queue');
      await mkdir(dataDir, {recursive: true, mode: 0o700});
      const release = await acquireLock(lockFile, deadline);
      try { return await operation(); }
      finally { await release(); }
    }).finally(() => { pending -= 1; });
    queue = current.catch(() => {});
    return current;
  }

  async function quarantineCorruptFile() {
    const backup = join(dataDir, `leaderboard.corrupt-${now()}-${randomBytes(4).toString('hex')}.json`);
    await rename(file, backup);
    warning = 'Invalid or unreadable leaderboard data was quarantined; the board is empty until new scores arrive.';
  }

  async function readLocked() {
    let info;
    try { info = await stat(file); }
    catch (error) { if (error?.code === 'ENOENT') return []; throw error; }
    if (info.size > MAX_PERSISTED_BYTES) {
      await quarantineCorruptFile();
      return [];
    }
    let data;
    try { data = JSON.parse(await readFile(file, 'utf8')); }
    catch {
      await quarantineCorruptFile();
      return [];
    }
    const topKeys = typeof data === 'object' && data !== null && !Array.isArray(data) ? Object.keys(data) : [];
    if (topKeys.length !== 1 || topKeys[0] !== 'leaderboard' || !Array.isArray(data.leaderboard) || data.leaderboard.length > MAX_PERSISTED_ROWS) {
      await quarantineCorruptFile();
      return [];
    }
    const entries = data.leaderboard.map(validPersistedEntry);
    if (entries.some(entry => entry === null)) {
      await quarantineCorruptFile();
      return [];
    }
    return merge(entries);
  }

  async function persistLocked(entries) {
    const bytes = Buffer.from(`${JSON.stringify({leaderboard: entries})}\n`, 'utf8');
    if (bytes.byteLength > MAX_PERSISTED_BYTES) throw errorWithCode('STORE_TOO_LARGE');
    const temp = join(dataDir, `leaderboard.tmp-${process.pid}-${randomBytes(8).toString('hex')}`);
    let handle;
    try {
      handle = await open(temp, 'wx', 0o600);
      await handle.writeFile(bytes);
      await handle.sync();
      await handle.close(); handle = null;
      await rename(temp, file);
      await syncDirectory(dataDir);
    } catch (error) {
      await handle?.close().catch(() => {});
      await unlink(temp).catch(() => {});
      throw error;
    }
  }

  return Object.freeze({
    async read() {
      return locked(async () => (await readLocked()).slice(0, 10));
    },
    async record(input) {
      const name = typeof input?.name === 'string' ? sanitizePlayerName(input.name) : '';
      const time = now();
      const candidate = validEntry({...input, name, recordedAt: time});
      if (!candidate) throw errorWithCode('INVALID_SCORE', 'Computed leaderboard result is invalid');
      return locked(async () => {
        const before = await readLocked();
        const previous = bestOf(before, candidate.name);
        const previousRank = rankOf(before.slice(0, 10), candidate.name);
        const board = merge([...before, candidate]);
        const previousJson = JSON.stringify(before);
        if (JSON.stringify(board) !== previousJson) await persistLocked(board);
        const personalBest = bestOf(board, candidate.name);
        return Object.freeze({
          leaderboard: Object.freeze(board.slice(0, 10)),
          rank: rankOf(board.slice(0, 10), candidate.name),
          previousRank,
          previousBestScore: previous?.score ?? null,
          personalBestScore: personalBest?.score ?? null,
          newPersonalBest: personalBest !== null && (!previous || compare(candidate, previous) < 0),
          recordedAt: candidate.recordedAt
        });
      });
    },
    warning() { return warning; },
    dataDirectory: dataDir
  });
}
