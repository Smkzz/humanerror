import { createServer } from 'node:http';
import { isIP } from 'node:net';
import { readFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GAME_VERSION, RULESET } from '../build/modules/engine.js';
import { sanitizePlayerName } from '../build/modules/profile.js';
import { createLeaderboardStore } from './leaderboard-store.mjs';
import { replayAdaptiveTranscript, MAX_TRANSCRIPT_EVENTS } from './replay.mjs';
import { createRunSessionStore } from './sessions.mjs';

const base = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const staticRoot = join(base, 'dist');
const dataDir = resolve(process.env.DATA_DIR || join(base, '.runtime'));
const port = Number(process.env.PORT ?? 4173);
const host = process.env.HOST ?? '127.0.0.1';
const trustedProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 0);
const MAX_BODY_BYTES = 64 * 1024;
const MAX_NAME_BYTES = 256;
const RUN_TIME_TOLERANCE_MS = 1000;
const RATE_LIMITS = Object.freeze({board: {limit: 120, windowMs: 60_000}, start: {limit: 12, windowMs: 10 * 60_000}, submit: {limit: 12, windowMs: 10 * 60_000}});

if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid PORT');
if (typeof host !== 'string' || !host.trim()) throw new Error('Invalid HOST');
if (!Number.isInteger(trustedProxyHops) || trustedProxyHops < 0 || trustedProxyHops > 16) throw new Error('Invalid TRUST_PROXY_HOPS');

const store = createLeaderboardStore(dataDir);
const sessions = createRunSessionStore({version: GAME_VERSION, ruleset: RULESET});
const rateBuckets = new Map();
const routes = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/manifest.json', ['manifest.json', 'application/json; charset=utf-8']]
]);

function baseHeaders() {
  return {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  };
}

function sendJson(res, status, value, head = false, extraHeaders = {}) {
  const body = Buffer.from(JSON.stringify(value), 'utf8');
  res.writeHead(status, {...baseHeaders(), 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': body.byteLength, ...extraHeaders});
  res.end(head ? undefined : body);
}

function sendText(res, status, text, extra = {}) {
  const body = Buffer.from(text, 'utf8');
  res.writeHead(status, {...baseHeaders(), 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': body.byteLength, ...extra});
  res.end(body);
}

function sameOriginMutation(req) {
  if (req.headers['sec-fetch-site'] === 'cross-site') return false;
  const origin = req.headers.origin;
  if (origin === undefined) return true;
  try {
    const parsed = new URL(origin);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.host.toLowerCase() === String(req.headers.host ?? '').toLowerCase();
  } catch { return false; }
}

function clientAddress(req) {
  if (trustedProxyHops > 0) {
    const raw = req.headers['x-forwarded-for'];
    if (typeof raw === 'string' && raw.length <= 512) {
      const forwarded = raw.split(',').map(value => value.trim());
      const index = forwarded.length - trustedProxyHops;
      const candidate = forwarded[index];
      if (index >= 0 && candidate && isIP(candidate)) return candidate;
    }
  }
  return req.socket.remoteAddress || 'unknown';
}

function pruneRateBuckets(now) {
  for (const [key, bucket] of rateBuckets) if (bucket.resetAt <= now) rateBuckets.delete(key);
  while (rateBuckets.size > 10_000) {
    let oldestKey = null, oldest = Infinity;
    for (const [key, bucket] of rateBuckets) if (bucket.resetAt < oldest) { oldest = bucket.resetAt; oldestKey = key; }
    if (oldestKey === null) break;
    rateBuckets.delete(oldestKey);
  }
}

function allowRequest(req, bucketName, res) {
  const policy = RATE_LIMITS[bucketName];
  const now = Date.now();
  pruneRateBuckets(now);
  const key = `${bucketName}:${clientAddress(req)}`;
  let bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = {count: 0, resetAt: now + policy.windowMs};
    rateBuckets.set(key, bucket);
  }
  if (bucket.count >= policy.limit) {
    const seconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    sendJson(res, 429, {error: 'Rate limit exceeded'}, false, {'Retry-After': String(seconds)});
    return false;
  }
  bucket.count++;
  return true;
}

function isJsonRequest(req) {
  const value = String(req.headers['content-type'] ?? '').trim();
  return /^application\/json(?:\s*;\s*charset\s*=\s*(?:utf-8|"utf-8"))?$/i.test(value);
}

async function readJsonBody(req, limit = MAX_BODY_BYTES) {
  const contentLength = req.headers['content-length'];
  if (typeof contentLength === 'string') {
    if (!/^(0|[1-9]\d*)$/.test(contentLength)) throw Object.assign(new Error('Invalid length'), {code: 'INVALID_JSON'});
    if (Number(contentLength) > limit) throw Object.assign(new Error('Body too large'), {code: 'BODY_TOO_LARGE'});
  }
  let size = 0, tooLarge = false;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.byteLength;
    if (size > limit) { tooLarge = true; chunks.length = 0; continue; }
    if (!tooLarge) chunks.push(chunk);
  }
  if (tooLarge) throw Object.assign(new Error('Body too large'), {code: 'BODY_TOO_LARGE'});
  if (size === 0) throw Object.assign(new Error('Empty body'), {code: 'INVALID_JSON'});
  let text;
  try { text = new TextDecoder('utf-8', {fatal: true}).decode(Buffer.concat(chunks)); }
  catch { throw Object.assign(new Error('Invalid UTF-8'), {code: 'INVALID_JSON'}); }
  try { return JSON.parse(text); }
  catch { throw Object.assign(new Error('Invalid JSON'), {code: 'INVALID_JSON'}); }
}

function hasExactKeys(value, keys) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every(key => Object.hasOwn(value, key));
}

function requestError(res, error) {
  if (error?.code === 'BODY_TOO_LARGE') return sendJson(res, 413, {error: 'Request body too large'});
  if (error?.code === 'STORE_BUSY') return sendJson(res, 503, {error: 'Leaderboard temporarily busy'});
  if (error?.code === 'SESSION_CAPACITY') return sendJson(res, 503, {error: 'Run sessions temporarily unavailable'});
  if (error?.code === 'INVALID_TRANSCRIPT') return sendJson(res, 422, {error: 'Run transcript could not be validated'});
  if (error?.code === 'INVALID_SCORE') return sendJson(res, 500, {error: 'Verified result was rejected by storage'});
  if (error?.code === 'INVALID_JSON') return sendJson(res, 400, {error: 'Invalid JSON request'});
  return sendJson(res, 503, {error: 'Service temporarily unavailable'});
}

async function handleApi(req, res, path) {
  if (path === '/api/health') {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, {...baseHeaders(), Allow: 'GET, HEAD'}); res.end(); return;
    }
    try {
      const leaderboard = await store.read();
      const health = {status: 'ok', ruleset: RULESET, leaderboardEntries: leaderboard.length};
      if (store.warning()) health.warning = store.warning();
      return sendJson(res, 200, health, req.method === 'HEAD');
    } catch {
      return sendJson(res, 503, {status: 'unavailable'} , req.method === 'HEAD');
    }
  }

  if (path === '/api/leaderboard') {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, {...baseHeaders(), Allow: 'GET, HEAD'}); res.end(); return;
    }
    if (!allowRequest(req, 'board', res)) return;
    try { return sendJson(res, 200, {leaderboard: await store.read()}, req.method === 'HEAD'); }
    catch { return sendJson(res, 503, {error: 'Leaderboard temporarily unavailable'}, req.method === 'HEAD'); }
  }

  if (path === '/api/run-sessions') {
    if (req.method !== 'POST') {
      res.writeHead(405, {...baseHeaders(), Allow: 'POST'}); res.end(); return;
    }
    if (!sameOriginMutation(req)) return sendJson(res, 403, {error: 'Same-origin requests only'});
    if (!allowRequest(req, 'start', res)) return;
    if (!isJsonRequest(req)) return sendJson(res, 415, {error: 'JSON required'});
    try {
      const body = await readJsonBody(req, 1024);
      if (!hasExactKeys(body, ['ruleset', 'version']) || body.ruleset !== RULESET || body.version !== GAME_VERSION) return sendJson(res, 409, {error: 'Game version is not supported'});
      const session = sessions.issue();
      return sendJson(res, 201, session);
    } catch (error) { return requestError(res, error); }
  }

  const submissionMatch = path.match(/^\/api\/run-sessions\/([a-f0-9]{32})\/submit$/);
  if (submissionMatch) {
    if (req.method !== 'POST') {
      res.writeHead(405, {...baseHeaders(), Allow: 'POST'}); res.end(); return;
    }
    if (!sameOriginMutation(req)) return sendJson(res, 403, {error: 'Same-origin requests only'});
    if (!allowRequest(req, 'submit', res)) return;
    if (!isJsonRequest(req)) return sendJson(res, 415, {error: 'JSON required'});
    const session = sessions.consume(submissionMatch[1]);
    if (!session) return sendJson(res, 410, {error: 'Run session expired or already used'});
    try {
      const body = await readJsonBody(req);
      if (!hasExactKeys(body, ['ruleset', 'version', 'name', 'events'])) return sendJson(res, 400, {error: 'Invalid run submission'});
      if (body.ruleset !== session.ruleset || body.version !== session.version || session.ruleset !== RULESET || session.version !== GAME_VERSION) return sendJson(res, 409, {error: 'Game version does not match the session'});
      if (typeof body.name !== 'string' || Buffer.byteLength(body.name, 'utf8') > MAX_NAME_BYTES) return sendJson(res, 400, {error: 'Invalid display name'});
      const name = sanitizePlayerName(body.name);
      if (!name) return sendJson(res, 400, {error: 'Invalid display name'});
      if (!Array.isArray(body.events) || body.events.length > MAX_TRANSCRIPT_EVENTS) return sendJson(res, 413, {error: 'Transcript is too large'});
      const result = replayAdaptiveTranscript({seed: session.seed, runId: session.id, events: body.events});
      if (Date.now() - session.issuedAt + RUN_TIME_TOLERANCE_MS < result.minimumElapsedMs) throw Object.assign(new Error('Run arrived before its referee timing allowed'), {code:'INVALID_TRANSCRIPT'});
      const recorded = await store.record({name, score: result.score, correct: result.correct, attempted: result.attempted, bestStreak: result.bestStreak});
      return sendJson(res, 200, {
        accepted: true,
        validation: 'server-replayed',
        ruleset: session.ruleset,
        version: session.version,
        score: result.score,
        correct: result.correct,
        attempted: result.attempted,
        bestStreak: result.bestStreak,
        endReason: result.endReason,
        activeMs: result.activeMs,
        leaderboard: recorded.leaderboard,
        rank: recorded.rank,
        previousRank: recorded.previousRank,
        previousBestScore: recorded.previousBestScore,
        personalBestScore: recorded.personalBestScore,
        newPersonalBest: recorded.newPersonalBest,
        recordedAt: recorded.recordedAt
      });
    } catch (error) { return requestError(res, error); }
  }

  if (path.startsWith('/api/')) {
    res.writeHead(404, {...baseHeaders(), 'Content-Type': 'text/plain; charset=utf-8'}); res.end('Not found'); return;
  }
  return null;
}

async function route(req, res) {
  let path;
  try { path = new URL(req.url ?? '/', 'http://localhost').pathname; }
  catch { return sendText(res, 400, 'Bad request'); }
  if (path.startsWith('/api/')) {
    const handled = await handleApi(req, res, path);
    if (handled === null) return;
    return;
  }
  if (path === '/favicon.ico' && (req.method === 'GET' || req.method === 'HEAD')) {
    res.writeHead(204, baseHeaders()); res.end(); return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, {...baseHeaders(), Allow: 'GET, HEAD'}); res.end(); return;
  }
  const file = routes.get(path);
  if (!file) return sendText(res, 404, 'Not found');
  try {
    const bytes = await readFile(join(staticRoot, file[0]));
    res.writeHead(200, {...baseHeaders(), 'Content-Type': file[1], 'Content-Length': bytes.byteLength, 'Content-Security-Policy': "frame-ancestors 'none'"});
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch { return sendText(res, 503, 'Build missing. Run npm run build.'); }
}

const server = createServer(async (req, res) => {
  try { await route(req, res); }
  catch (error) {
    if (!res.headersSent) requestError(res, error);
    else res.destroy();
  }
});
server.requestTimeout = 10_000;
server.headersTimeout = 5_000;
server.keepAliveTimeout = 5_000;
server.maxRequestsPerSocket = 100;

server.listen(port, host, () => {
  const address = server.address();
  const activePort = typeof address === 'object' && address ? address.port : port;
  console.log(`HUMAN ERROR: http://${host}:${activePort}`);
});

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`HUMAN ERROR: received ${signal}; closing gracefully`);
  const forceClose = setTimeout(() => server.closeAllConnections(), 5000);
  forceClose.unref();
  server.close(() => {
    clearTimeout(forceClose);
    console.log('HUMAN ERROR: server stopped');
  });
  server.closeIdleConnections();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
