/* Alta de un cliente (UC-021): arma en una carpeta todo lo que va a su repo, sin nada de la base.
   Copia core/ sin demo.js, la tarea de respaldo y un tienda.json para completar, y genera index.html
   desde tienda.html. No pisa tienda.json ni img/ si ya existen: lo propio del cliente no se toca (regla hard 2).
   Con una subcarpeta, el catálogo va dentro de un sitio que ya existe (por ejemplo /catalogo/) y la tarea de
   respaldo queda en la raíz del repo, corriendo en esa subcarpeta.
   Uso: node scripts/alta.mjs <repo del cliente> [subcarpeta] */
import { cp, mkdir, readFile, readdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc } from '../core/datos.js';

const BASE = fileURLToPath(new URL('..', import.meta.url));
// Lo que el cliente recibe de la base y se reemplaza en cada alta o actualización.
export const DE_LA_BASE = ['scripts/respaldo.mjs', 'scripts/xlsx.mjs'];
const WORKFLOW = '.github/workflows/respaldo.yml';
const existe = ruta => access(ruta).then(() => true, () => false);

// index.html del cliente: el mismo catálogo de tienda.html, fijo en su tienda.json y sin nada de la base:
// se puede indexar, el título es su nombre y el ícono su logo, o tienda.icono si el logo es apaisado (regla hard 7).
export function paginaCliente(html, tienda = {}) {
  const nombre = esc(tienda.nombre || 'Catálogo');
  let p = html
    .replace(/<html[^>]*>/, '<html lang="es-AR" data-tienda="tienda.json">')
    .replace(/<meta name="robots"[^>]*>\n?/, '')
    .replace(/<title>[^<]*<\/title>/, `<title>${nombre}</title>`)
    .replace(/<link rel="icon"[^>]*>/, tienda.icono || tienda.logo ? `<link rel="icon" href="${esc(tienda.icono || tienda.logo)}">` : '');
  if (tienda.bajada) p = p.replace(/(<title>[^<]*<\/title>)/, `$1\n<meta name="description" content="${esc(tienda.bajada)}">`);
  return p;
}

// La tarea de respaldo de un catálogo en subcarpeta: GitHub solo lee los workflows de la raíz del repo.
export function workflowEnSubcarpeta(yml, sub) {
  if (!sub) return yml;
  return yml.replace(/(\n {4}timeout-minutes: \d+\n)/, `$1    defaults:\n      run:\n        working-directory: ${sub}\n`);
}

export async function armarAlta(repo, { base = BASE, sub = '' } = {}) {
  const destino = join(repo, sub);
  await mkdir(join(destino, 'core'), { recursive: true });
  for (const f of await readdir(join(base, 'core'))) if (f !== 'demo.js') await cp(join(base, 'core', f), join(destino, 'core', f));
  for (const f of DE_LA_BASE) await cp(join(base, f), join(destino, f));
  await mkdir(join(repo, '.github', 'workflows'), { recursive: true });
  await writeFile(join(repo, WORKFLOW), workflowEnSubcarpeta(await readFile(join(base, WORKFLOW), 'utf8'), sub));
  // Sin package.json, Node no sabe que core/datos.js es un módulo y el respaldo no corre.
  await writeFile(join(destino, 'package.json'), JSON.stringify({ private: true, type: 'module' }, null, 1) + '\n');
  const nuevo = !await existe(join(destino, 'tienda.json'));
  if (nuevo) await cp(join(base, 'cliente', 'tienda.json'), join(destino, 'tienda.json'));
  await mkdir(join(destino, 'img'), { recursive: true });
  const tienda = JSON.parse(await readFile(join(destino, 'tienda.json'), 'utf8'));
  await writeFile(join(destino, 'index.html'), paginaCliente(await readFile(join(base, 'tienda.html'), 'utf8'), tienda));
  return { nuevo };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [repo, sub = ''] = process.argv.slice(2);
  if (!repo) { console.error('Uso: node scripts/alta.mjs <repo del cliente> [subcarpeta]'); process.exit(2); }
  const { nuevo } = await armarAlta(repo, { sub }), destino = join(repo, sub);
  console.log(nuevo
    ? `Listo en ${destino}. Completá tienda.json y el logo en img/, y después corré node scripts/verificar-alta.mjs ${destino}`
    : `Núcleo actualizado en ${destino}; tienda.json e img/ quedaron como estaban.`);
}
