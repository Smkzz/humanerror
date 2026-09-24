import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { computeServerModulesIdentity, verifyBuildProvenance } from '../scripts/build-provenance.mjs';

const release = {version:'0.6.0', ruleset:'6'};

async function fixture(t, overrides = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'human-error-provenance-'));
  t.after(() => rm(directory, {recursive:true, force:true}));
  const staticRoot = join(directory, 'dist');
  const moduleRoot = join(directory, 'modules');
  await mkdir(staticRoot, {recursive:true});
  await mkdir(moduleRoot, {recursive:true});
  const html = Buffer.from('<!doctype html><title>HUMAN ERROR — test</title>');
  await writeFile(join(moduleRoot, 'engine.js'), 'export const RULESET = "6";\n');
  await writeFile(join(moduleRoot, 'profile.js'), 'export const sanitizePlayerName = value => value;\n');
  const modules = await computeServerModulesIdentity(moduleRoot);
  const manifest = {...release, htmlBytes:html.byteLength, sha256:createHash('sha256').update(html).digest('hex'), ...modules, ...overrides};
  await writeFile(join(staticRoot, 'index.html'), html);
  await writeFile(join(staticRoot, 'manifest.json'), JSON.stringify(manifest));
  return {directory, staticRoot, moduleRoot, manifest, html};
}

test('build provenance verifies one exact browser and server-module release build', async t => {
  const {staticRoot, moduleRoot, manifest} = await fixture(t);
  const result = await verifyBuildProvenance(staticRoot, {...release, moduleRoot});
  assert.deepEqual(result, manifest);
  assert.equal(Object.isFrozen(result), true);
});

for (const [field, value] of [['version', '0.3.0'], ['ruleset', '3']]) {
  test(`build provenance rejects a release ${field} mismatch`, async t => {
    const {staticRoot, moduleRoot} = await fixture(t, {[field]:value});
    await assert.rejects(verifyBuildProvenance(staticRoot, {...release, moduleRoot}), /Build provenance verification failed: manifest release .* does not match server release/);
  });
}

test('build provenance rejects changed HTML with the same byte length', async t => {
  const {staticRoot, moduleRoot, html} = await fixture(t);
  const changed = Buffer.from(html);
  changed[changed.length - 1] ^= 1;
  await writeFile(join(staticRoot, 'index.html'), changed);
  await assert.rejects(verifyBuildProvenance(staticRoot, {...release, moduleRoot}), /Build provenance verification failed: dist\/index.html identity mismatch/);
});

test('build provenance rejects a byte-count mismatch even when the HTML hash matches', async t => {
  const {staticRoot, moduleRoot, manifest} = await fixture(t);
  await writeFile(join(staticRoot, 'manifest.json'), JSON.stringify({...manifest, htmlBytes:manifest.htmlBytes + 1}));
  await assert.rejects(verifyBuildProvenance(staticRoot, {...release, moduleRoot}), /Build provenance verification failed: dist\/index.html identity mismatch/);
});

test('build provenance rejects same-version compiled module content drift', async t => {
  const {staticRoot, moduleRoot} = await fixture(t);
  await writeFile(join(moduleRoot, 'engine.js'), 'export const RULESET = "6"; export const changed = true;\n');
  await assert.rejects(verifyBuildProvenance(staticRoot, {...release, moduleRoot}), /Build provenance verification failed: compiled server module identity mismatch/);
});

test('build provenance rejects a changed compiled module file set', async t => {
  const {staticRoot, moduleRoot} = await fixture(t);
  await writeFile(join(moduleRoot, 'stale.js'), 'export const stale = true;\n');
  await assert.rejects(verifyBuildProvenance(staticRoot, {...release, moduleRoot}), /Build provenance verification failed: compiled server module identity mismatch/);
});
