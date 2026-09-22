import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
const port = Number(process.env.PORT ?? 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
const routes = new Map([['/', ['index.html', 'text/html; charset=utf-8']], ['/index.html', ['index.html', 'text/html; charset=utf-8']], ['/manifest.json', ['manifest.json', 'application/json; charset=utf-8']]]);
const server = createServer(async (req, res) => {
  // Development server uses an exact allowlist, not arbitrary filesystem paths.
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, {Allow: 'GET, HEAD'}); res.end(); return; }
  const path = new URL(req.url ?? '/', 'http://localhost').pathname;
  if (path === '/favicon.ico') { res.writeHead(204, {'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'}); res.end(); return; }
  const file = routes.get(path);
  if (!file) { res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'}); res.end('Not found'); return; }
  try {
    const bytes = await readFile(resolve(root, file[0]));
    res.writeHead(200, {'Content-Type':file[1], 'Content-Length':bytes.byteLength, 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer', 'Permissions-Policy':'camera=(), microphone=(), geolocation=()', 'Content-Security-Policy':"frame-ancestors 'none'"});
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch { res.writeHead(503, {'Content-Type':'text/plain; charset=utf-8'}); res.end('Build missing. Run npm run build.'); }
});
server.requestTimeout = 5000; server.headersTimeout = 5000;
server.listen(port, '127.0.0.1', () => console.log(`HUMAN ERROR: http://127.0.0.1:${port}`));
