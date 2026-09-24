import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, join } from 'node:path';
import { computeServerModulesIdentity } from './build-provenance.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
mkdirSync('build', {recursive:true});

const localCompiler = join(root, 'node_modules/typescript/bin/tsc');
const localBun = join(root, 'node_modules/bun/bin/bun.exe');
if (!existsSync(localCompiler) || !existsSync(localBun)) {
  throw new Error('Pinned build tools are missing. Run npm ci first.');
}
function run(exe, args, label) {
  const r = spawnSync(exe, args, {stdio:'inherit', shell:false});
  if (r.error || r.status !== 0) throw new Error(`${label} failed. ${r.error?.message ?? `exit ${r.status}`}`);
}
function compile(args) {
  run(process.execPath, [localCompiler, ...args], 'TypeScript');
}

rmSync('build/modules', {recursive:true, force:true});
rmSync('build/bundle.amd.js', {force:true});
rmSync('build/browser.iife.js', {force:true});
compile(['-p','tsconfig.json']);

const serverModules = await computeServerModulesIdentity(join(root,'build','modules'));
run(localBun, ['build','src/app.ts','--target','browser','--format','iife','--minify','--outfile','build/browser.iife.js'], 'Browser bundle');

const normalize = value => value.replace(/\r\n?/g,'\n');
const compactJs = normalize(readFileSync('build/browser.iife.js','utf8')).trim();
const css = normalize(readFileSync('site/style.css','utf8'));
const sha = value => createHash('sha256').update(value).digest('base64');
if (/<\/script/i.test(compactJs) || /<\/style/i.test(css)) throw new Error('Unsafe inline bundle delimiter');

const csp = `default-src 'none'; script-src 'sha256-${sha(compactJs)}'; style-src 'sha256-${sha(css)}'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'`;
const html = normalize(readFileSync('site/shell.html','utf8'))
  .replace('<!-- CSP -->', `<meta http-equiv="Content-Security-Policy" content="${csp}">`)
  .replace('<!-- CSS -->', `<style>${css}</style>`)
  .replace('<!-- JS -->', `<script>${compactJs}</script>`);
if (html.includes('<!-- JS -->') || !html.includes('id="app"') || !html.includes('HUMAN ERROR')) throw new Error('Incomplete built page');

mkdirSync('dist',{recursive:true});
writeFileSync('dist/index.html',html);
writeFileSync('dist/_headers',`/*
  Content-Security-Policy: ${csp}; frame-ancestors 'none'
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=()
`);
const manifest = {
  version:'0.7.0',
  ruleset:'7',
  htmlBytes:Buffer.byteLength(html),
  gzipBytes:gzipSync(html,{level:9}).byteLength,
  sha256:createHash('sha256').update(html).digest('hex'),
  ...serverModules,
  runtimeDependencies:0
};
writeFileSync('dist/manifest.json',JSON.stringify(manifest,null,2)+'\n');
if (existsSync('build/modules/app.d.ts')) rmSync('build/modules/app.d.ts');
console.log(JSON.stringify(manifest));
