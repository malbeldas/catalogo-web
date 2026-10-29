// Servidor estático mínimo para la prueba de humo: sirve la carpeta que recibe como segundo argumento, sin dependencias.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const [puerto = 4174, raiz = '.'] = process.argv.slice(2);
const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' };

createServer(async (req, res) => {
  try {
    let ruta = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    if (ruta.endsWith('/')) ruta += 'index.html';
    const cuerpo = await readFile(join(raiz, ruta));
    res.writeHead(200, { 'content-type': tipos[extname(ruta)] || 'application/octet-stream' }).end(cuerpo);
  } catch {
    res.writeHead(404).end('no encontrado');
  }
}).listen(Number(puerto));
