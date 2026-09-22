import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, join } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
mkdirSync('build', {recursive: true});
const localCompiler = join(root, 'node_modules/typescript/bin/tsc');
const compiler = existsSync(localCompiler) ? [process.execPath, localCompiler] : ['tsc'];
function compile(args) {
  const r = spawnSync(compiler[0], [...compiler.slice(1), ...args], {stdio:'inherit', shell: process.platform === 'win32' && compiler[0] === 'tsc'});
  if (r.error || r.status !== 0) throw new Error(`TypeScript failed. Run npm install first. ${r.error?.message ?? ''}`);
}
compile(['-p', 'tsconfig.json']);
compile(['-p', 'tsconfig.json', '--module', 'AMD', '--outFile', 'build/bundle.amd.js', '--declaration', 'false']);
const loader = `(() => {\n'use strict';\nconst definitions = new Map(), cache = new Map();\nfunction define(name, dependencies, factory) {\n if (definitions.has(name)) throw new Error('Duplicate built module');\n definitions.set(name, {dependencies, factory});\n}\nfunction load(name) {\n name = name.replace(/^\\.\\//, '').replace(/\\.js$/, '');\n if (cache.has(name)) return cache.get(name);\n const definition = definitions.get(name);\n if (!definition) throw new Error('Unknown built module: ' + name);\n const exported = Object.create(null); cache.set(name, exported);\n definition.factory(...definition.dependencies.map(d => d === 'exports' ? exported : d === 'require' ? load : load(d)));\n return exported;\n}\n`;
const js = loader + readFileSync('build/bundle.amd.js', 'utf8') + '\nload("app");\n})();\n';
const css = readFileSync('site/style.css', 'utf8');
const sha = content => createHash('sha256').update(content).digest('base64');
// No unsafe-inline / unsafe-eval; only this exact script and stylesheet may execute.
const csp = `default-src 'none'; script-src 'sha256-${sha(js)}'; style-src 'sha256-${sha(css)}'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`;
const html = readFileSync('site/shell.html','utf8')
 .replace('<!-- CSP -->', `<meta http-equiv="Content-Security-Policy" content="${csp}">`)
 .replace('<!-- CSS -->', `<style>${css}</style>`)
 .replace('<!-- JS -->', `<script>${js}</script>`);
if (html.includes('<!-- JS -->') || !html.includes('DO WHAT')) throw new Error('Incomplete built page');
if (/<\/script/i.test(js) || /<\/style/i.test(css)) throw new Error('Unsafe bundle delimiter');
mkdirSync('dist', {recursive: true});
writeFileSync('dist/index.html', html);
writeFileSync('dist/_headers', `/*\n  Content-Security-Policy: ${csp}; frame-ancestors 'none'\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n`);
const manifest = {version: '0.2.0', ruleset: '2', htmlBytes: Buffer.byteLength(html), gzipBytes: gzipSync(html).byteLength, sha256: createHash('sha256').update(html).digest('hex'), runtimeDependencies: 0};
writeFileSync('dist/manifest.json', JSON.stringify(manifest,null,2)+'\n');
// A portable artifact is deliberately generated from the same tested sources.
// Publishing or copying artifacts is deliberately separate from the portable build.
if (existsSync('build/modules/app.d.ts')) rmSync('build/modules/app.d.ts');
console.log(JSON.stringify(manifest));
