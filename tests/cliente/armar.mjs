/* Cliente de prueba para el CI de la base (STORY-008): arma con scripts/alta.mjs un sitio con el catálogo en una
   subcarpeta, con el ejemplo de ropa (precios ocultos) como tienda.json, un QR de reseñas y su copia de la planilla. Después el CI corre
   ahí los tests del cliente, igual que en el repo de un comercio: así un alta nueva sale con CI en verde.
   Uso: node tests/cliente/armar.mjs <carpeta del sitio> */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { armarAlta } from '../../scripts/alta.mjs';

const BASE = new URL('../../', import.meta.url).pathname;
const SUB = 'catalogo';
const sitio = process.argv[2];
if (!sitio) { console.error('Uso: node tests/cliente/armar.mjs <carpeta del sitio>'); process.exit(2); }

const { productos, categorias, ...ropa } = JSON.parse(await readFile(join(BASE, 'tiendas/ropa.json'), 'utf8'));
const destino = join(sitio, SUB);
await mkdir(destino, { recursive: true });
await writeFile(join(destino, 'tienda.json'), JSON.stringify({ ...ropa, planilla: { privada: true }, resenas: 'https://g.page/r/PRUEBA/review' }, null, 1) + '\n');
await writeFile(join(destino, 'catalogo-respaldo.json'), JSON.stringify({
  actualizado: '2026-10-27T00:00:00.000Z',
  productos: productos.map(({ id, n, cat, d = '', img = '' }) => ({ id, n, cat, d, p: null, antes: null, img: img && '../' + img })),
  ajustes: { wa: ropa.wa, precios: false },
}, null, 1) + '\n');
await armarAlta(sitio, { sub: SUB });
console.log(`Cliente de prueba en ${destino}`);
