import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));

const manifest = readJson('dist/manifest.json');
const html = readFileSync('dist/index.html');
if (sha256(html) !== manifest.sha256) throw new Error('dist/index.html SHA-256 does not match manifest');
if (html.length !== manifest.htmlBytes) throw new Error('dist/index.html byte count does not match manifest');
if (manifest.runtimeDependencies !== 0) throw new Error('release unexpectedly has runtime dependencies');

const checksums = readFileSync('SHA256SUMS', 'utf8').trim().split(/\r?\n/).filter(Boolean);
for (const line of checksums) {
  const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
  if (!match) throw new Error(`Malformed SHA256SUMS line: ${line}`);
  const [, expected, path] = match;
  const actual = sha256(readFileSync(path));
  if (actual !== expected) throw new Error(`SHA256SUMS mismatch for ${path}`);
}

const receiptNames = [
  'qa/v07-all-132-desktop.json',
  'qa/v07-all-132-small.json',
  'qa/v07-browser-challenge.json',
  'qa/v07-browser-server.json'
];
for (const path of receiptNames) {
  const receipt = readJson(path);
  if (receipt.result !== 'PASS') throw new Error(`${path} is not PASS`);
  if (receipt.artifact?.sha256 !== manifest.sha256) throw new Error(`${path} is bound to a different browser artifact`);
  if (receipt.artifact?.htmlBytes !== manifest.htmlBytes || receipt.artifact?.gzipBytes !== manifest.gzipBytes) {
    throw new Error(`${path} artifact size identity does not match manifest`);
  }
}

for (const path of ['qa/v07-all-132-desktop.json', 'qa/v07-all-132-small.json']) {
  const receipt = readJson(path);
  if (receipt.expectedTemplates !== 132 || receipt.seenTemplates !== 132 || receipt.count !== 132 || receipt.noRepeat !== true) {
    throw new Error(`${path} does not prove 132 unique templates`);
  }
  if (receipt.allSettlementsAccepted !== true || receipt.deckFinished !== true) {
    throw new Error(`${path} does not prove accepted settlements and deck completion`);
  }
  if (!Number.isInteger(receipt.gradedCorrect) || !Number.isInteger(receipt.neutralSettlements) ||
      receipt.gradedCorrect + receipt.neutralSettlements !== 132) {
    throw new Error(`${path} settlement counts are inconsistent`);
  }
  if (receipt.finalResult?.correct !== receipt.gradedCorrect || receipt.finalResult?.attempted !== receipt.gradedCorrect) {
    throw new Error(`${path} final result does not match graded-correct count`);
  }
  if (receipt.javascriptErrors?.length || receipt.networkRequests?.length) {
    throw new Error(`${path} contains browser errors or unexpected network requests`);
  }
}

const challenge = readJson('qa/v07-browser-challenge.json');
if (challenge.sameSeedFirst32Exact !== true || challenge.differentSeedFirst12Different !== true) {
  throw new Error('Challenge determinism receipt is incomplete');
}

const timed = readJson('qa/v07-browser-server.json');
if (timed.browserServerParity !== true || timed.leaderboardSubmissionAccepted !== true || timed.noRepeat !== true) {
  throw new Error('Timed Adaptive replay/leaderboard receipt is incomplete');
}

const audit = readJson('qa/static-audit.json');
if (audit.result !== 'PASS' || audit.htmlBytes !== manifest.htmlBytes || audit.gzipBytes !== manifest.gzipBytes) {
  throw new Error('Static audit is not bound to the current release identity');
}

console.log(JSON.stringify({
  result: 'PASS',
  checksums: checksums.length,
  artifact: manifest.sha256,
  receipts: receiptNames.length
}));
