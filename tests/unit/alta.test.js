// UC-021 — Alta de un cliente: scripts/alta.mjs arma su carpeta y scripts/verificar-alta.mjs la revisa (SPEC.md §2, §3, §7).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, writeFile, appendFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { paginaCliente, armarAlta, workflowEnSubcarpeta } from '../../scripts/alta.mjs';
import { revisarTienda, revisarPestanas, marcasAjenas, revisarNucleo, verificarAlta } from '../../scripts/verificar-alta.mjs';

const BASE = new URL('../../', import.meta.url).pathname;
const URL_WEB = 'https://docs.google.com/spreadsheets/d/e/PRUEBA/pub?gid=0&single=true&output=csv';
const URL_AJUSTES = URL_WEB.replace('gid=0', 'gid=1');
const tienda = { id: 'kiosco', nombre: 'Kiosco Ana', bajada: 'Golosinas y bebidas', logo: 'img/logo.png', color: '#7c3aed', wa: '5491122223333', precios: true, planilla: { web: URL_WEB, ajustes: URL_AJUSTES } };
const WEB = 'Código,Nombre,Categoría,Descripción,Precio,Precio anterior,Foto,Visible\r\nA1,Alfajor triple,Golosinas,,900,,,\r\n';
const WEB_SIN_PRECIOS = 'Código,Nombre,Categoría,Descripción,Precio,Precio anterior,Foto,Visible\r\nA1,Alfajor triple,Golosinas,,,,,\r\n';
const AJUSTES = (precios = 'SÍ') => `Ajuste,Valor,Para qué sirve\r\nWhatsApp,,\r\nPrecios,${precios},\r\n`;
const planilla = (web, ajustes) => async url => ({ ok: true, text: async () => url === URL_WEB ? web : ajustes });

async function altaCompleta() {
  const dir = await mkdtemp(join(tmpdir(), 'alta-'));
  await writeFile(join(dir, 'tienda.json'), JSON.stringify(tienda));
  await armarAlta(dir);
  await writeFile(join(dir, 'img', 'logo.png'), 'png');
  return dir;
}

test('AC-021-1 el alta copia core/ igual al de la base, sin demo.js ni nada de la portada o los ejemplos', async () => {
  const dir = await altaCompleta();
  const core = await readdir(join(dir, 'core'));
  assert.deepEqual(core.sort(), (await readdir(join(BASE, 'core'))).filter(f => f !== 'demo.js').sort());
  for (const f of core) assert.deepEqual(await readFile(join(dir, 'core', f)), await readFile(join(BASE, 'core', f)), f);
  const raiz = await readdir(dir);
  for (const f of ['tiendas', 'tienda.html', 'cliente', 'tests', 'SPEC.md', 'CLAUDE.md']) assert.ok(!raiz.includes(f), f);
  assert.deepEqual(JSON.parse(await readFile(join(dir, 'package.json'), 'utf8')).type, 'module');
  await readFile(join(dir, '.github/workflows/respaldo.yml'));
  await readFile(join(dir, 'scripts/respaldo.mjs'));
});

test('AC-021-1 volver a correr el alta no pisa tienda.json ni img/ del cliente', async () => {
  const dir = await altaCompleta();
  assert.deepEqual(await armarAlta(dir), { nuevo: false });
  assert.deepEqual(JSON.parse(await readFile(join(dir, 'tienda.json'), 'utf8')), tienda);
  assert.equal(await readFile(join(dir, 'img', 'logo.png'), 'utf8'), 'png');
});

test('AC-021-1 una carpeta nueva recibe un tienda.json para completar', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'alta-'));
  assert.deepEqual(await armarAlta(dir), { nuevo: true });
  const t = JSON.parse(await readFile(join(dir, 'tienda.json'), 'utf8'));
  assert.deepEqual(Object.keys(t.planilla), ['web', 'ajustes']);
  assert.ok(revisarTienda(t).length > 0, 'el molde sin completar no pasa la verificación');
});

test('UC-021 index.html del cliente: fijo en tienda.json, indexable, con su nombre y su logo', () => {
  const base = '<html lang="es-AR" data-ejemplos="a b">\n<title>Catálogo</title>\n<meta name="robots" content="noindex">\n<link rel="icon" href="data:image/svg+xml,x">\n';
  const p = paginaCliente(base, { nombre: 'Kiosco <Ana>', bajada: 'Golosinas', logo: 'img/logo.png' });
  assert.match(p, /<html lang="es-AR" data-tienda="tienda.json">/);
  assert.doesNotMatch(p, /noindex|data-ejemplos|data:image/);
  assert.match(p, /<title>Kiosco &lt;Ana&gt;<\/title>\n<meta name="description" content="Golosinas">/);
  assert.match(p, /<link rel="icon" href="img\/logo.png">/);
  assert.match(paginaCliente(base, { logo: 'img/logo.png', icono: 'img/icono.png' }), /<link rel="icon" href="img\/icono.png">/);
});

test('AC-021-1 un alta completa pasa la verificación', async () => {
  assert.deepEqual(await verificarAlta(await altaCompleta(), { fetch: planilla(WEB, AJUSTES()) }), []);
});

test('AC-021-1 la verificación pide nombre, color, WhatsApp, las dos URLs CSV y el logo', () => {
  assert.deepEqual(revisarTienda(tienda), []);
  const mal = revisarTienda({ ...tienda, nombre: ' ', color: 'violeta', wa: '+54 9 11 2222', planilla: { web: 'https://docs.google.com/spreadsheets/d/ABC/edit' }, logo: '' });
  assert.equal(mal.length, 6);
  assert.match(mal.join('\n'), /nombre[\s\S]*color[\s\S]*wa [\s\S]*planilla\.web[\s\S]*planilla\.ajustes[\s\S]*logo/);
  assert.deepEqual(revisarTienda(null), ['tienda.json no existe o no es JSON válido']);
});

test('AC-021-1 la verificación avisa si el logo no está en img/', async () => {
  const dir = await altaCompleta();
  await writeFile(join(dir, 'tienda.json'), JSON.stringify({ ...tienda, logo: 'img/otro.png' }));
  assert.deepEqual(await verificarAlta(dir, { fetch: planilla(WEB, AJUSTES()) }), ['no existe el logo img/otro.png']);
});

test('AC-010-4 la verificación avisa si una pestaña no está publicada como CSV', () => {
  assert.deepEqual(revisarPestanas(WEB, AJUSTES()), []);
  assert.match(revisarPestanas('<html>Google</html>', AJUSTES()).join(), /planilla\.web no devuelve la pestaña Web/);
  assert.match(revisarPestanas(WEB, null).join(), /planilla\.ajustes no devuelve la pestaña Ajustes/);
  assert.match(revisarPestanas(AJUSTES(), WEB).join(), /planilla\.web[\s\S]*planilla\.ajustes/);
  assert.match(revisarPestanas('Código,Nombre\r\n', AJUSTES()).join(), /no tiene productos/);
});

test('BR-PRE-001 con Precios = NO la verificación falla si la pestaña Web publica importes', () => {
  assert.match(revisarPestanas(WEB, AJUSTES('NO')).join(), /BR-PRE-001/);
  assert.deepEqual(revisarPestanas(WEB_SIN_PRECIOS, AJUSTES('NO')), []);
  // Ajustes vacío: vale precios de tienda.json.
  assert.match(revisarPestanas(WEB, 'Ajuste,Valor\r\n', { precios: false }).join(), /BR-PRE-001/);
});

test('AC-021-1 la verificación falla si se editó core/ en el cliente o se copió demo.js', async () => {
  const dir = await altaCompleta();
  await appendFile(join(dir, 'core', 'catalogo.css'), '\n.x{}');
  await writeFile(join(dir, 'core', 'demo.js'), '');
  assert.deepEqual(await revisarNucleo(dir), ['core/demo.js es solo de la base', 'core/catalogo.css no es igual al de la base: no se edita en un cliente']);
});

test('regla hard 7: la verificación encuentra Pueyrredón, PLED y Mostrador, salvo el nombre del propio cliente', async () => {
  assert.deepEqual(marcasAjenas('Distribuidora Pueyrredon · PLED · Mostrador'), ['Pueyrredón', 'PLED', 'Mostrador']);
  assert.deepEqual(marcasAjenas('<title>PLED Iluminación</title>', 'PLED Iluminación'), []);
  assert.deepEqual(marcasAjenas('PLED y Pueyrredón', 'PLED Iluminación'), ['Pueyrredón']);
  assert.deepEqual(marcasAjenas('templed, ampled'), []);
  const dir = await altaCompleta();
  await writeFile(join(dir, 'tienda.json'), JSON.stringify({ ...tienda, bajada: 'Revendedor de Pueyrredón' }));
  assert.deepEqual(await verificarAlta(dir, { fetch: planilla(WEB, AJUSTES()) }), ['tienda.json menciona "Pueyrredón" (regla hard 7)']);
});

test('UC-021 con subcarpeta el catálogo va dentro del sitio y la tarea de respaldo queda en la raíz del repo', async () => {
  const repo = await mkdtemp(join(tmpdir(), 'alta-sub-'));
  await writeFile(join(repo, 'index.html'), 'sitio propio');
  await armarAlta(repo, { sub: 'catalogo' });
  assert.equal(await readFile(join(repo, 'index.html'), 'utf8'), 'sitio propio', 'no pisa el inicio del sitio');
  for (const f of ['index.html', 'tienda.json', 'package.json', 'scripts/respaldo.mjs', 'core/catalogo.js']) await readFile(join(repo, 'catalogo', f));
  const yml = await readFile(join(repo, '.github/workflows/respaldo.yml'), 'utf8');
  assert.match(yml, /\n {4}defaults:\n {6}run:\n {8}working-directory: catalogo\n {4}steps:/);
  assert.equal(workflowEnSubcarpeta(yml.replace(/ {4}defaults:[\s\S]*?catalogo\n/, ''), ''), yml.replace(/ {4}defaults:[\s\S]*?catalogo\n/, ''));
});
