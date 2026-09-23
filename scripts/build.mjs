import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, join } from 'node:path';
import ts from 'typescript';

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
const normalizeInline = content => content.replace(/\r\n?/g, '\n');
const js = normalizeInline(loader + readFileSync('build/bundle.amd.js', 'utf8') + '\nload("app");\n})();\n');
function astShape(source, label) {
  const file = ts.createSourceFile('inline-bundle.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if (file.parseDiagnostics.length) throw new Error(`${label} bundle did not parse: ${file.parseDiagnostics.map(item => `${item.start}: ${ts.flattenDiagnosticMessageText(item.messageText, ' ')} [${source.slice(item.start, (item.start ?? 0) + 40)}]`).join('; ')}`);
  function shape(node) {
    const children = [];
    node.forEachChild(child => { children.push(shape(child)); });
    return children.length || node.kind === ts.SyntaxKind.Block ? [node.kind, children] : [node.kind, node.getText(file)];
  }
  return JSON.stringify(shape(file));
}
function compactInlineJavaScript(source) {
  const restricted = new Set([ts.SyntaxKind.ReturnKeyword, ts.SyntaxKind.ThrowKeyword, ts.SyntaxKind.BreakKeyword, ts.SyntaxKind.ContinueKeyword, ts.SyntaxKind.YieldKeyword, ts.SyntaxKind.AsyncKeyword]);
  const parsed = ts.createSourceFile('inline-bundle.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const opaqueTokens = [];
  function collectOpaque(node) {
    if ([ts.SyntaxKind.RegularExpressionLiteral, ts.SyntaxKind.TemplateExpression, ts.SyntaxKind.NoSubstitutionTemplateLiteral].includes(node.kind)) {
      opaqueTokens.push({start:node.getStart(parsed), end:node.end, text:node.getText(parsed), kind:node.kind});
      return;
    }
    node.forEachChild(collectOpaque);
  }
  collectOpaque(parsed);
  opaqueTokens.sort((a, b) => a.start - b.start);
  let working = '', cursor = 0;
  for (const [index, opaque] of opaqueTokens.entries()) {
    opaque.marker = `__INLINE_OPAQUE_PLACEHOLDER_${index}__`;
    if (source.includes(opaque.marker)) throw new Error('Inline bundle contains a reserved compactor marker');
    working += source.slice(cursor, opaque.start) + opaque.marker;
    cursor = opaque.end;
  }
  working += source.slice(cursor);
  const opaqueByMarker = new Map(opaqueTokens.map(opaque => [opaque.marker, opaque]));
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, working);
  let opaqueCount = 0;
  let output = '', previous = null;
  while (scanner.scan() !== ts.SyntaxKind.EndOfFileToken) {
    const token = {kind:scanner.getToken(), text:scanner.getTokenText(), start:scanner.getTokenPos(), end:scanner.getTextPos()};
    const opaque = opaqueByMarker.get(token.text);
    if (opaque) {
      token.kind = opaque.kind;
      token.text = opaque.text;
      opaqueCount++;
    }
    if (previous) {
      const gap = working.slice(previous.end, token.start);
      const lineBreakMatters = /[\r\n]/.test(gap) && (restricted.has(previous.kind) || token.kind === ts.SyntaxKind.PlusPlusToken || token.kind === ts.SyntaxKind.MinusMinusToken);
      if (lineBreakMatters) output += '\n';
      else if ([ts.SyntaxKind.RegularExpressionLiteral, ts.SyntaxKind.TemplateExpression, ts.SyntaxKind.NoSubstitutionTemplateLiteral].includes(previous.kind) || [ts.SyntaxKind.RegularExpressionLiteral, ts.SyntaxKind.TemplateExpression, ts.SyntaxKind.NoSubstitutionTemplateLiteral].includes(token.kind)) output += ' ';
      else {
        const pair = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, previous.text + token.text);
        const firstKind = pair.scan(), firstText = pair.getTokenText();
        const secondKind = pair.scan(), secondText = pair.getTokenText();
        const sameTokens = firstKind === previous.kind && firstText === previous.text && secondKind === token.kind && secondText === token.text && pair.scan() === ts.SyntaxKind.EndOfFileToken;
        if (!sameTokens) output += ' ';
      }
    }
    output += token.text;
    previous = token;
  }
  if (opaqueCount !== opaqueTokens.length) throw new Error('Inline bundle compaction failed to preserve regular expressions or templates');
  const originalShape = JSON.parse(astShape(source, 'Original'));
  const compactShape = JSON.parse(astShape(output, 'Compacted'));
  function firstDifference(left, right, path = 'root') {
    if (!Array.isArray(left) || !Array.isArray(right) || left[0] !== right[0]) return `${path}: ${JSON.stringify(left).slice(0, 100)} != ${JSON.stringify(right).slice(0, 100)}`;
    const leftChildren = Array.isArray(left[1]) ? left[1] : null;
    const rightChildren = Array.isArray(right[1]) ? right[1] : null;
    if (!leftChildren || !rightChildren) return JSON.stringify(left) === JSON.stringify(right) ? null : `${path}: ${JSON.stringify(left).slice(0, 100)} != ${JSON.stringify(right).slice(0, 100)}`;
    if (leftChildren.length !== rightChildren.length) return `${path}: child count ${leftChildren.length} != ${rightChildren.length}`;
    for (let i = 0; i < leftChildren.length; i++) { const difference = firstDifference(leftChildren[i], rightChildren[i], `${path}.${left[0]}[${i}]`); if (difference) return difference; }
    return null;
  }
  const difference = firstDifference(originalShape, compactShape);
  if (difference) throw new Error(`Inline bundle compaction changed JavaScript syntax: ${difference}`);
  return output;
}
const compactJs = compactInlineJavaScript(js);
const css = normalizeInline(readFileSync('site/style.css', 'utf8'));
const sha = content => createHash('sha256').update(content).digest('base64');
// No unsafe-inline / unsafe-eval; only this exact script and stylesheet may execute.
const csp = `default-src 'none'; script-src 'sha256-${sha(compactJs)}'; style-src 'sha256-${sha(css)}'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'`;
const html = readFileSync('site/shell.html','utf8')
 .replace('<!-- CSP -->', `<meta http-equiv="Content-Security-Policy" content="${csp}">`)
 .replace('<!-- CSS -->', `<style>${css}</style>`)
 .replace('<!-- JS -->', `<script>${compactJs}</script>`);
if (html.includes('<!-- JS -->') || !html.includes('CLAIM #1.')) throw new Error('Incomplete built page');
if (/<\/script/i.test(js) || /<\/style/i.test(css)) throw new Error('Unsafe bundle delimiter');
mkdirSync('dist', {recursive: true});
writeFileSync('dist/index.html', html);
writeFileSync('dist/_headers', `/*\n  Content-Security-Policy: ${csp}; frame-ancestors 'none'\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n`);
const manifest = {version: '0.4.0', ruleset: '4', htmlBytes: Buffer.byteLength(html), gzipBytes: gzipSync(html).byteLength, sha256: createHash('sha256').update(html).digest('hex'), runtimeDependencies: 0};
writeFileSync('dist/manifest.json', JSON.stringify(manifest,null,2)+'\n');
// A portable artifact is deliberately generated from the same tested sources.
// Publishing or copying artifacts is deliberately separate from the portable build.
if (existsSync('build/modules/app.d.ts')) rmSync('build/modules/app.d.ts');
console.log(JSON.stringify(manifest));
