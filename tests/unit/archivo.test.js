// AC-010-5 — El comercio comparte su planilla tal como la tiene (Hoja de Google, Excel o CSV en Drive) y la tarea
// respaldo la lee con el link del secreto PLANILLA_URL, sin "Publicar en la Web" (SPEC.md §3, §4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateRawSync, crc32 } from 'node:zlib';
import { respaldoDesdeFilas, ajustesDesdeFilas, filaDeTitulos, productosDesdeFilas } from '../../core/datos.js';
import { leerXlsx } from '../../scripts/xlsx.mjs';
import { enlacesDeDescarga, leerArchivo, actualizarRespaldo } from '../../scripts/respaldo.mjs';

// Zip mínimo, como lo guardan Excel y Google: cada archivo comprimido con deflate.
function zip(archivos) {
  const locales = [], centrales = [];
  let pos = 0;
  for (const [nombre, contenido] of Object.entries(archivos)) {
    const datos = Buffer.from(contenido), comp = deflateRawSync(datos), n = Buffer.from(nombre), crc = crc32(datos);
    const l = Buffer.alloc(30);
    l.writeUInt32LE(0x04034b50, 0); l.writeUInt16LE(20, 4); l.writeUInt16LE(8, 8); l.writeUInt32LE(crc, 14);
    l.writeUInt32LE(comp.length, 18); l.writeUInt32LE(datos.length, 22); l.writeUInt16LE(n.length, 26);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(8, 10); c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(comp.length, 20); c.writeUInt32LE(datos.length, 24); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(pos, 42);
    locales.push(l, n, comp); centrales.push(c, n);
    pos += 30 + n.length + comp.length;
  }
  const central = Buffer.concat(centrales), fin = Buffer.alloc(22), k = centrales.length / 2;
  fin.writeUInt32LE(0x06054b50, 0); fin.writeUInt16LE(k, 8); fin.writeUInt16LE(k, 10); fin.writeUInt32LE(central.length, 12); fin.writeUInt32LE(pos, 16);
  return Buffer.concat([...locales, central, fin]);
}

// Libro xlsx con las hojas dadas como XML de <sheetData>, y los textos compartidos.
function libro(hojas, compartidos = []) {
  const nombres = Object.keys(hojas);
  return zip({
    'xl/workbook.xml': `<workbook><sheets>${nombres.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<Relationships>${nombres.map((_, i) => `<Relationship Id="rId${i + 1}" Type="x" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}</Relationships>`,
    'xl/sharedStrings.xml': `<sst>${compartidos.map(s => `<si>${s}</si>`).join('')}</sst>`,
    ...Object.fromEntries(nombres.map((n, i) => [`xl/worksheets/sheet${i + 1}.xml`, `<worksheet><sheetData>${hojas[n]}</sheetData></worksheet>`])),
  });
}
const t = (ref, s) => `<c r="${ref}" t="inlineStr"><is><t>${s}</t></is></c>`;
const fila = (n, ...celdas) => `<row r="${n}">${celdas.join('')}</row>`;
const titulos = fila(1, ...['Código', 'Nombre', 'Categoría', 'Descripción', 'Precio', 'Precio anterior', 'Foto', 'Visible'].map((s, i) => t('ABCDEFGH'[i] + 1, s)));
const ajustes = precios => fila(1, t('A1', 'Ajuste'), t('B1', 'Valor')) + fila(2, t('A2', 'WhatsApp'), `<c r="B2"><v>5491122223333</v></c>`) + fila(3, t('A3', 'Precios'), t('B3', precios));
// Como lo guarda Excel: texto con formato partido en varios <t>, un número, una fórmula con su último valor,
// celdas salteadas, un & escapado y una fila oculta con Visible = NO.
const EXCEL = (precios = 'SÍ') => libro({
  Productos: titulos +
    fila(2, t('A2', 'A1'), `<c r="B2" t="s"><v>0</v></c>`, t('C2', 'Golosinas'), `<c r="E2"><v>900</v></c>`, `<c r="F2"><f>E2*1.2</f><v>1080</v></c>`) +
    fila(3, t('A3', 'B1'), t('B3', 'Jugo &amp; galletitas'), t('C3', 'Bebidas'), `<c r="E3" t="str"><f>"$ 1.500"</f><v>$ 1.500</v></c>`) +
    fila(4, t('A4', 'C1'), t('B4', 'Producto viejo'), t('E4', '100'), t('H4', 'NO')),
  Ajustes: ajustes(precios),
  Web: fila(1, t('A1', 'Código'), t('B1', 'Nombre')),
}, ['<r><t>Alfajor </t></r><r><rPr><b/></rPr><t>triple</t></r>']);

test('AC-010-5 un Excel con pestañas Productos y Ajustes arma el respaldo: textos con formato, números, fórmulas y Visible', () => {
  const a = leerArchivo(EXCEL());
  const r = respaldoDesdeFilas(a.productos, ajustesDesdeFilas(a.ajustes));
  assert.deepEqual(r.productos.map(p => [p.id, p.n, p.cat, p.p, p.antes]), [['A1', 'Alfajor triple', 'Golosinas', 900, 1080], ['B1', 'Jugo & galletitas', 'Bebidas', 1500, null]]);
  assert.deepEqual(r.ajustes, { wa: '5491122223333', precios: true });
});

test('AC-010-5 la plantilla de la base se lee como Excel desde la pestaña Productos, sin depender de las fórmulas de Web', async () => {
  const buf = await readFile(new URL('../../plantilla/planilla-comercio.xlsx', import.meta.url));
  assert.deepEqual(leerXlsx(buf).map(h => h.nombre), ['Productos', 'Ajustes', 'Web', 'Ayuda']);
  const a = leerArchivo(buf), r = respaldoDesdeFilas(a.productos, ajustesDesdeFilas(a.ajustes));
  assert.equal(r.productos.length, productosDesdeFilas(a.productos).length);
  assert.ok(r.productos.length > 0);
  assert.equal(r.productos[0].n, 'Remera de algodón lisa');
  assert.equal(r.productos[0].p, 12900);
});

test('AC-010-5 un CSV guardado con el Excel en castellano (punto y coma, Latin-1) se lee igual', () => {
  const csv = Buffer.from('Código;Nombre;Precio\r\nA1;Lámpara cálida;"$ 1.200,50"\r\n', 'latin1');
  const r = respaldoDesdeFilas(leerArchivo(csv).productos, {}, { precios: true });
  assert.deepEqual(r.productos.map(p => [p.id, p.n, p.p]), [['A1', 'Lámpara cálida', 1200.5]]);
  const utf8 = Buffer.from('﻿Nombre,Precio\nTaza,"6.500"\n');
  assert.equal(respaldoDesdeFilas(leerArchivo(utf8).productos, {}, { precios: true }).productos[0].p, 6500);
});

test('AC-010-5 la lista propia del comercio sirve con un título arriba y columnas Producto, Rubro e Imagen', () => {
  const filas = [['Lista de precios octubre 2026'], [], ['SKU', 'Producto', 'Rubro', 'Imagen', 'Precio'], ['x9', 'Foco LED 9W', 'Lámparas', 'https://x.com/a.jpg', '1500']];
  assert.equal(filaDeTitulos(filas), 2);
  assert.deepEqual(respaldoDesdeFilas(filas, {}, { precios: true }).productos, [{ id: 'x9', n: 'Foco LED 9W', cat: 'Lámparas', d: '', p: 1500, antes: null, img: 'https://x.com/a.jpg' }]);
  assert.equal(filaDeTitulos([['Código', 'Precio']]), -1);
  assert.equal(respaldoDesdeFilas([['Código', 'Precio'], ['a', '1']]), null);
});

test('AC-010-5 un archivo que no es planilla no arma respaldo: página de Google, zip roto o sin columna Nombre', () => {
  assert.equal(leerArchivo(Buffer.from('<!DOCTYPE html><html><title>Google Drive: Iniciar sesión</title>')), null);
  assert.equal(leerArchivo(Buffer.from('﻿  <html>')), null);
  assert.equal(leerArchivo(Buffer.from('PK\x03\x04roto')), null);
  assert.equal(leerArchivo(Buffer.from('Código,Precio\nA1,100\n')), null);
  assert.equal(leerArchivo(Buffer.alloc(0)), null);
  assert.equal(leerArchivo(libro({ Hoja1: fila(1, t('A1', 'Nada')) })), null);
});

test('AC-010-5 sin pestaña Productos se usa la primera hoja con columna Nombre, y nunca la pestaña Web', () => {
  const a = leerArchivo(libro({ Web: titulos + fila(2, t('B2', 'De Web')), Hoja1: fila(1, t('A1', 'Nombre')) + fila(2, t('A2', 'De la Hoja1')) }));
  assert.deepEqual(productosDesdeFilas(a.productos).map(p => p.n), ['De la Hoja1']);
  assert.equal(a.ajustes, null);
});

test('AC-010-5 links de Google: una Hoja se baja como Excel y un archivo de Drive tal cual, probando la otra forma después', () => {
  const ID = '1Ck22hnHWHW5MStKkkPKHhUC63my6Se25';
  const hoja = `https://docs.google.com/spreadsheets/d/${ID}/export?format=xlsx`, archivo = `https://drive.google.com/uc?export=download&id=${ID}`;
  assert.deepEqual(enlacesDeDescarga(`https://docs.google.com/spreadsheets/d/${ID}/edit?usp=sharing&ouid=1&rtpof=true&sd=true`), [hoja, archivo]);
  assert.deepEqual(enlacesDeDescarga(`https://docs.google.com/spreadsheets/d/${ID}/edit#gid=0`), [hoja, archivo]);
  assert.deepEqual(enlacesDeDescarga(`https://drive.google.com/file/d/${ID}/view?usp=drive_link`), [archivo, hoja]);
  assert.deepEqual(enlacesDeDescarga(`https://drive.google.com/open?id=${ID}`), [archivo, hoja]);
  assert.deepEqual(enlacesDeDescarga(` https://ejemplo.com/lista.csv `), ['https://ejemplo.com/lista.csv']);
  // El link de "Publicar en la Web" no es un archivo de Drive: se usa tal cual.
  const pub = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vAbCdEfGhIjKlMnOpQrStUv/pub?output=csv';
  assert.deepEqual(enlacesDeDescarga(pub), [pub]);
  assert.deepEqual(enlacesDeDescarga(''), []);
});

// Carpeta con tienda.json en modo privado y, si se pasa, un respaldo previo; fetch responde lo que diga `respuestas`.
async function escenario({ tienda = { id: 'x', precios: true, planilla: { privada: true } }, previo, respuestas = {} } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'archivo-'));
  const rutas = { tienda: join(dir, 'tienda.json'), salida: join(dir, 'catalogo-respaldo.json') };
  await writeFile(rutas.tienda, JSON.stringify(tienda));
  if (previo) await writeFile(rutas.salida, JSON.stringify(previo));
  const pedidas = [];
  const fetch = async url => {
    pedidas.push(url);
    const r = respuestas[url];
    if (r == null) return { ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) };
    const buf = Buffer.from(r);
    return { ok: true, status: 200, arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length) };
  };
  const correr = link => actualizarRespaldo({ ...rutas, fetch, link, ahora: () => new Date('2026-10-26T12:00:00Z') });
  return { pedidas, correr, leer: async () => JSON.parse(await readFile(rutas.salida, 'utf8')) };
}
const ID = 'AbCdEfGhIjKlMnOpQrStUvWx';
const LINK = `https://docs.google.com/spreadsheets/d/${ID}/edit?usp=sharing&rtpof=true`;
const [HOJA, ARCHIVO] = enlacesDeDescarga(LINK);

test('AC-010-5 con PLANILLA_URL el script baja el Excel de Drive y escribe catalogo-respaldo.json', async () => {
  // Un Excel subido a Drive no se exporta como Hoja: falla el primer link y se baja tal cual con el segundo.
  const e = await escenario({ respuestas: { [ARCHIVO]: EXCEL() } });
  assert.deepEqual(await e.correr(LINK), { estado: 'actualizado', productos: 2 });
  assert.deepEqual(e.pedidas, [HOJA, ARCHIVO]);
  const r = await e.leer();
  assert.deepEqual(r.productos.map(p => p.n), ['Alfajor triple', 'Jugo & galletitas']);
  assert.deepEqual(r.ajustes, { wa: '5491122223333', precios: true });
  assert.deepEqual(await e.correr(LINK), { estado: 'sin-cambios', productos: 2 });
});

test('BR-PRE-001 con Precios = NO en el Excel el respaldo publicado no tiene importes', async () => {
  const e = await escenario({ respuestas: { [HOJA]: EXCEL('NO') } });
  assert.equal((await e.correr(LINK)).estado, 'actualizado');
  const texto = JSON.stringify(await e.leer());
  assert.doesNotMatch(texto, /900|1080|1500/);
  assert.ok((await e.leer()).productos.every(p => p.p === null && p.antes === null));
});

test('AC-010-5 sin pestaña Ajustes valen los de tienda.json, también para ocultar precios (BR-PRE-001)', async () => {
  const csv = 'Nombre,Precio\nTaza,6500\n';
  const e = await escenario({ tienda: { precios: false, planilla: { privada: true } }, respuestas: { 'https://ejemplo.com/lista.csv': csv } });
  assert.equal((await e.correr('https://ejemplo.com/lista.csv')).estado, 'actualizado');
  assert.deepEqual((await e.leer()).productos.map(p => [p.n, p.p]), [['Taza', null]]);
});

test('AC-010-4 un archivo no compartido (página de Google) deja la tarea en rojo sin tocar la copia anterior', async () => {
  const previo = { actualizado: 'antes', productos: [{ id: 'a', n: 'Guardado' }], ajustes: {} };
  const e = await escenario({ previo, respuestas: { [HOJA]: '<html>Iniciar sesión</html>', [ARCHIVO]: '<html>Solicitar acceso</html>' } });
  assert.deepEqual(await e.correr(LINK), { estado: 'invalido' });
  assert.deepEqual(await e.leer(), previo);
});
