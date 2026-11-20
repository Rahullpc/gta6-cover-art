// serve.ts — tiny static dev server for the Vice Cover Studio v26 app
// (Node 22, standard library only). Serves the app folder on
// 127.0.0.1:8080 (or --port <n>).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const APP_DIR = resolve(ROOT, 'app');

function mimeFor(path) {
  const table = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.txt': 'text/plain; charset=utf-8',
  };
  return table[extname(path).toLowerCase()] || 'application/octet-stream';
}

function parsePort(argv) {
  const flag = argv.indexOf('--port');
  if (flag < 0) return 8080;
  const p = Number(argv[flag + 1]);
  return Number.isInteger(p) && p > 0 && p < 65536 ? p : 8080;
}

const port = parsePort(process.argv);

const server = createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    let path = normalize(join(APP_DIR, decodeURIComponent(url.pathname)));
    if (path !== APP_DIR && !path.startsWith(APP_DIR + sep)) {
      res.writeHead(403); res.end('forbidden'); return;
    }
    if (path === APP_DIR || url.pathname.endsWith('/')) path = join(path, 'index.html');
    const data = await readFile(path);
    res.writeHead(200, { 'Content-Type': mimeFor(path) });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('not found');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Vice Cover Studio at http://localhost:${port}`);
});
