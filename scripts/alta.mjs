/* Alta de un cliente (UC-021): arma en una carpeta todo lo que va a su repo, sin nada de la base.
   Copia core/ sin demo.js, la tarea de respaldo, sus tests con ci.yml (SPEC.md §6) y un tienda.json para completar,
   y genera index.html desde tienda.html. Con tienda.resenas genera también resena.html, adonde apunta el QR de reseñas (UC-023). No pisa tienda.json ni img/ si ya existen: lo propio del cliente no se toca (regla hard 2).
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
const CI = '.github/workflows/ci.yml';
// Tests del catálogo del cliente (cliente/tests/ de la base): se reemplazan en cada alta o actualización, como core/.
export const TESTS_CLIENTE = ['catalogo.test.js', 'catalogo.spec.js', 'resena.spec.js', 'playwright.config.js', 'servidor.js'];
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

// Link de reseña del Perfil de Empresa de Google: el corto de "Pedir reseñas" o el de writereview con el place ID.
export const esLinkResena = link =>
  /^https:\/\/(g\.page\/r\/[\w-]+\/review|search\.google\.com\/local\/writereview\?placeid=[\w-]+)([?&#][^\s"'<>]*)?$/.test(String(link ?? ''));

// resena.html: el QR impreso apunta acá y no a Google, así sigue sirviendo si cambia el link.
// Manda directo al formulario de reseña, sin pedir estrellas ni ofrecer nada (AC-023-1, política de Google).
// Con GA4 cuenta el escaneo como resena_qr, sin datos de quien escanea (AC-023-3, regla hard 5).
export function paginaResena(tienda = {}) {
  if (!esLinkResena(tienda.resenas)) return null;
  const destino = esc(tienda.resenas), nombre = esc(tienda.nombre || ''), ga4 = /^G-[A-Z0-9]+$/.test(tienda.ga4 || '') ? tienda.ga4 : '';
  const medir = ga4 ? `
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}
gtag('js',new Date());gtag('config','${ga4}',{send_page_view:false});
gtag('event','resena_qr',{transport_type:'beacon',event_callback:ir});setTimeout(ir,1000);
var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id=${ga4}';document.head.append(s);` : '\nir();';
  return `<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Reseña · ${nombre}</title>
<noscript><meta http-equiv="refresh" content="0;url=${destino}"></noscript>
<script>
var listo=false;function ir(){if(!listo){listo=true;location.replace(${JSON.stringify(tienda.resenas)})}}${medir}
</script>
</head>
<body style="font:16px/1.4 system-ui,sans-serif;text-align:center;padding:40px 20px">
<p><a href="${destino}">Dejar una reseña de ${nombre} en Google</a></p>
</body>
</html>
`;
}

// La tarea de respaldo de un catálogo en subcarpeta: GitHub solo lee los workflows de la raíz del repo.
export function workflowEnSubcarpeta(yml, sub) {
  if (!sub) return yml;
  return yml.replace(/(\n {4}timeout-minutes: \d+\n)/, `$1    defaults:\n      run:\n        working-directory: ${sub}\n`);
}

// ci.yml del cliente: en una subcarpeta corre ahí, y la prueba de humo sirve todo el sitio (SUBCARPETA).
export function ciDelCliente(yml, sub) {
  if (!sub) return yml;
  return workflowEnSubcarpeta(yml, sub).replace(`        working-directory: ${sub}\n`, `        working-directory: ${sub}\n    env:\n      SUBCARPETA: ${sub}\n`);
}

export async function armarAlta(repo, { base = BASE, sub = '' } = {}) {
  const destino = join(repo, sub);
  await mkdir(join(destino, 'core'), { recursive: true });
  for (const f of await readdir(join(base, 'core'))) if (f !== 'demo.js') await cp(join(base, 'core', f), join(destino, 'core', f));
  for (const f of DE_LA_BASE) await cp(join(base, f), join(destino, f));
  await mkdir(join(repo, '.github', 'workflows'), { recursive: true });
  await writeFile(join(repo, WORKFLOW), workflowEnSubcarpeta(await readFile(join(base, WORKFLOW), 'utf8'), sub));
  await mkdir(join(destino, 'tests'), { recursive: true });
  for (const f of TESTS_CLIENTE) await cp(join(base, 'cliente', 'tests', f), join(destino, 'tests', f));
  await writeFile(join(repo, CI), ciDelCliente(await readFile(join(base, 'cliente', 'ci.yml'), 'utf8'), sub));
  // Sin package.json, Node no sabe que core/datos.js es un módulo y el respaldo no corre.
  await writeFile(join(destino, 'package.json'), JSON.stringify({ private: true, type: 'module' }, null, 1) + '\n');
  const nuevo = !await existe(join(destino, 'tienda.json'));
  if (nuevo) await cp(join(base, 'cliente', 'tienda.json'), join(destino, 'tienda.json'));
  await mkdir(join(destino, 'img'), { recursive: true });
  const tienda = JSON.parse(await readFile(join(destino, 'tienda.json'), 'utf8'));
  await writeFile(join(destino, 'index.html'), paginaCliente(await readFile(join(base, 'tienda.html'), 'utf8'), tienda));
  const resena = paginaResena(tienda);
  if (resena) await writeFile(join(destino, 'resena.html'), resena);
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
