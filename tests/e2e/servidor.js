// Servidor estático mínimo para los E2E: sirve la raíz del repo, sin dependencias.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const raiz = new URL('../../', import.meta.url).pathname;
const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' };

createServer(async (req, res) => {
  const ruta = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  try {
    const cuerpo = await readFile(join(raiz, ruta.endsWith('/') ? ruta + 'index.html' : ruta));
    res.writeHead(200, { 'content-type': tipos[extname(ruta)] || 'application/octet-stream' }).end(cuerpo);
  } catch {
    res.writeHead(404).end('no encontrado');
  }
}).listen(Number(process.argv[2] || 4173));
