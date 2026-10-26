import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { armarRespaldo, esPestana, mismoRespaldo } from '../../core/datos.js';
import { actualizarRespaldo } from '../../scripts/respaldo.mjs';

const WEB = 'https://docs.google.com/spreadsheets/d/e/X/pub?gid=0&output=csv';
const AJUSTES = 'https://docs.google.com/spreadsheets/d/e/X/pub?gid=1&output=csv';
const csvWeb = (...filas) => ['Código,Nombre,Categoría,Descripción,Precio,Precio anterior,Foto', ...filas].join('\n');
const BUENO = csvWeb('g5,Guirnalda 5 m,Guirnaldas,,"$ 14.900","$ 17.900",', 'l1,Lámpara G125,Lámparas,,8900,,');
const AJ = 'Ajuste,Valor,Para qué sirve\nWhatsApp,5491176033649,\nPrecios,SÍ,';
const HTML = '<!DOCTYPE html><html><head><title>Página no encontrada</title></head><body>Lo sentimos</body></html>';
const ahora = () => new Date('2026-10-26T12:00:00Z');

// Arma una carpeta con tienda.json y, si se pasa, un respaldo previo; fetch responde lo que diga `respuestas`.
async function escenario({ tienda = { id: 'x', precios: true, planilla: { web: WEB, ajustes: AJUSTES } }, previo, respuestas = {} } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'respaldo-'));
  const rutas = { tienda: join(dir, 'tienda.json'), salida: join(dir, 'catalogo-respaldo.json') };
  await writeFile(rutas.tienda, JSON.stringify(tienda));
  if (previo !== undefined) await writeFile(rutas.salida, typeof previo === 'string' ? previo : JSON.stringify(previo));
  const pedidas = [];
  const fetch = async url => {
    pedidas.push(url);
    const r = respuestas[url];
    if (r instanceof Error) throw r;
    if (r == null) return { ok: false, status: 404, text: async () => '' };
    return { ok: true, status: 200, text: async () => r };
  };
  const correr = () => actualizarRespaldo({ ...rutas, fetch, ahora });
  const leer = async () => JSON.parse(await readFile(rutas.salida, 'utf8'));
  return { ...rutas, pedidas, correr, leer };
}

test('UC-010 escenario 3: un CSV válido de la pestaña Web arma el respaldo con productos y ajustes', () => {
  const r = armarRespaldo(BUENO, { wa: '5491176033649', precios: true });
  assert.deepEqual(r.productos.map(p => [p.id, p.n, p.p, p.antes]), [['g5', 'Guirnalda 5 m', 14900, 17900], ['l1', 'Lámpara G125', 8900, null]]);
  assert.deepEqual(r.ajustes, { wa: '5491176033649', precios: true });
});

test('UC-010 escenario 3: una respuesta HTML, un CSV sin columna Nombre o sin productos no arman respaldo', () => {
  assert.equal(armarRespaldo(HTML), null);
  assert.equal(armarRespaldo('﻿  <html><body>Iniciar sesión</body></html>'), null);
  assert.equal(armarRespaldo('Código,Precio\ng5,14900'), null);
  assert.equal(armarRespaldo(csvWeb()), null);
  assert.equal(armarRespaldo(csvWeb(',,,,,,', 'x1,,Sin nombre,,100,,')), null);
  assert.equal(armarRespaldo(''), null);
  assert.equal(armarRespaldo(null), null);
});

test('formato: esPestana reconoce la columna sin importar mayúsculas, acentos ni BOM', () => {
  assert.equal(esPestana('﻿código,NOMBRE,precio', 'nombre'), true);
  assert.equal(esPestana('Ajuste,Valor', 'ajuste'), true);
  assert.equal(esPestana('Ajuste,Valor', 'nombre'), false);
  assert.equal(esPestana(HTML, 'nombre'), false);
});

test('AC-011-1: con Precios = NO el respaldo no guarda importes aunque la pestaña los traiga (BR-PRE-001)', () => {
  const r = armarRespaldo(BUENO, { precios: false }, { precios: true });
  assert.ok(r.productos.every(p => p.p == null && p.antes == null));
  assert.doesNotMatch(JSON.stringify(r.productos), /14900|17900|8900/);
});

test('formato: mismoRespaldo ignora la fecha y compara productos y ajustes', () => {
  const a = armarRespaldo(BUENO, { precios: true });
  assert.equal(mismoRespaldo({ actualizado: '2026-10-01T00:00:00Z', ...a }, armarRespaldo(BUENO, { precios: true })), true);
  assert.equal(mismoRespaldo(a, armarRespaldo(BUENO, { precios: false })), false);
  assert.equal(mismoRespaldo(a, armarRespaldo(csvWeb('g5,Guirnalda 5 m,,,14900,,'), { precios: true })), false);
  assert.equal(mismoRespaldo(null, a), false);
});

test('UC-010 escenario 3: el script escribe catalogo-respaldo.json con la planilla válida', async () => {
  const e = await escenario({ respuestas: { [WEB]: BUENO, [AJUSTES]: AJ } });
  assert.deepEqual(await e.correr(), { estado: 'actualizado', productos: 2 });
  const r = await e.leer();
  assert.equal(r.actualizado, '2026-10-26T12:00:00.000Z');
  assert.equal(r.productos.length, 2);
  assert.deepEqual(r.ajustes, { wa: '5491176033649', precios: true });
});

test('UC-010 escenario 3: si nada cambió, el script no vuelve a escribir el archivo', async () => {
  const e = await escenario({ respuestas: { [WEB]: BUENO, [AJUSTES]: AJ } });
  await e.correr();
  const antes = await readFile(e.salida, 'utf8');
  const mtime = (await stat(e.salida)).mtimeMs;
  assert.deepEqual(await e.correr(), { estado: 'sin-cambios', productos: 2 });
  assert.equal(await readFile(e.salida, 'utf8'), antes);
  assert.equal((await stat(e.salida)).mtimeMs, mtime);
});

test('UC-010 escenario 3: una planilla despublicada, caída o vacía no reemplaza la copia anterior', async () => {
  const previo = JSON.stringify({ actualizado: '2026-10-01T00:00:00.000Z', productos: [{ id: 'g5', n: 'Guirnalda 5 m' }], ajustes: {} });
  for (const web of [HTML, null, new Error('sin red'), 'Código,Precio\ng5,100', csvWeb()]) {
    const e = await escenario({ previo, respuestas: { [WEB]: web, [AJUSTES]: AJ } });
    assert.equal((await e.correr()).estado, 'invalido');
    assert.equal(await readFile(e.salida, 'utf8'), previo);
  }
});

test('UC-010 escenario 3: si Ajustes no responde se conservan los ajustes de la copia anterior', async () => {
  const previo = { actualizado: '2026-10-01T00:00:00.000Z', productos: [], ajustes: { wa: '5491100000000', precios: false } };
  const e = await escenario({ previo, respuestas: { [WEB]: BUENO, [AJUSTES]: HTML } });
  assert.equal((await e.correr()).estado, 'actualizado');
  const r = await e.leer();
  assert.deepEqual(r.ajustes, { wa: '5491100000000', precios: false });
  assert.ok(r.productos.every(p => p.p == null), 'Precios = NO sigue vigente');
});

test('AC-011-1: con Precios = NO en Ajustes el archivo publicado no tiene importes', async () => {
  const e = await escenario({ respuestas: { [WEB]: BUENO, [AJUSTES]: 'Ajuste,Valor\nPrecios,NO' } });
  await e.correr();
  assert.doesNotMatch(await readFile(e.salida, 'utf8'), /14900|17900|8900|"p":\s*\d/);
});

test('SPEC §4: sin planilla en tienda.json el script termina sin pedir nada ni escribir', async () => {
  const e = await escenario({ tienda: { id: 'demo', productos: [] } });
  assert.deepEqual(await e.correr(), { estado: 'sin-planilla' });
  assert.deepEqual(e.pedidas, []);
  await assert.rejects(stat(e.salida));
});

test('SPEC §4: sin pestaña Ajustes configurada solo se pide la pestaña Web', async () => {
  const e = await escenario({ tienda: { id: 'x', precios: true, planilla: { web: WEB } }, respuestas: { [WEB]: BUENO } });
  assert.equal((await e.correr()).estado, 'actualizado');
  assert.deepEqual(e.pedidas, [WEB]);
});
