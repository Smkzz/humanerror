import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

function provenanceError(message, cause) {
  return new Error(`Build provenance verification failed: ${message}`, cause ? {cause} : undefined);
}

async function listJavaScriptFiles(root, relative = '') {
  let entries;
  try {
    entries = await readdir(join(root, ...relative.split('/').filter(Boolean)), {withFileTypes:true});
  } catch (error) {
    throw provenanceError('compiled server modules are missing or unreadable', error);
  }
  const files = [];
  for (const entry of entries) {
    const name = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await listJavaScriptFiles(root, name));
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(name);
  }
  return files.sort();
}

/** Creates a deterministic identity for the complete compiled JavaScript module set. */
export async function computeServerModulesIdentity(moduleRoot) {
  const files = await listJavaScriptFiles(moduleRoot);
  if (files.length === 0) throw provenanceError('compiled server module set is empty');
  const digest = createHash('sha256');
  for (const relative of files) {
    const bytes = await readFile(join(moduleRoot, ...relative.split('/')));
    digest.update(relative, 'utf8');
    digest.update('\0');
    digest.update(String(bytes.byteLength), 'utf8');
    digest.update('\0');
    digest.update(bytes);
    digest.update('\0');
  }
  return Object.freeze({serverModuleCount:files.length, serverModulesSha256:digest.digest('hex')});
}

/** Verifies that the served HTML and compiled referee modules are one exact release build. */
export async function verifyBuildProvenance(staticRoot, {version, ruleset, moduleRoot}) {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(join(staticRoot, 'manifest.json'), 'utf8'));
  } catch (error) {
    throw provenanceError('dist/manifest.json is missing or invalid JSON', error);
  }
  if (typeof manifest !== 'object' || manifest === null || Array.isArray(manifest)) throw provenanceError('dist/manifest.json must be an object');
  if (manifest.version !== version || manifest.ruleset !== ruleset) {
    throw provenanceError(`manifest release ${String(manifest.version)}/${String(manifest.ruleset)} does not match server release ${version}/${ruleset}`);
  }
  if (!Number.isSafeInteger(manifest.htmlBytes) || manifest.htmlBytes < 0 || !/^[a-f0-9]{64}$/.test(manifest.sha256 ?? '')) {
    throw provenanceError('manifest HTML identity fields are invalid');
  }
  if (!Number.isSafeInteger(manifest.serverModuleCount) || manifest.serverModuleCount < 1 || !/^[a-f0-9]{64}$/.test(manifest.serverModulesSha256 ?? '')) {
    throw provenanceError('manifest server-module identity fields are invalid');
  }

  let html;
  try { html = await readFile(join(staticRoot, 'index.html')); }
  catch (error) { throw provenanceError('dist/index.html is missing or unreadable', error); }
  const sha256 = createHash('sha256').update(html).digest('hex');
  if (html.byteLength !== manifest.htmlBytes || sha256 !== manifest.sha256) {
    throw provenanceError(`dist/index.html identity mismatch (expected ${manifest.htmlBytes} bytes/${manifest.sha256}, found ${html.byteLength} bytes/${sha256})`);
  }

  const modules = await computeServerModulesIdentity(moduleRoot);
  if (modules.serverModuleCount !== manifest.serverModuleCount || modules.serverModulesSha256 !== manifest.serverModulesSha256) {
    throw provenanceError(`compiled server module identity mismatch (expected ${manifest.serverModuleCount} files/${manifest.serverModulesSha256}, found ${modules.serverModuleCount} files/${modules.serverModulesSha256})`);
  }

  return Object.freeze({version, ruleset, htmlBytes:html.byteLength, sha256, ...modules});
}
