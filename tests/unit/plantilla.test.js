import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

// Lee una parte del .xlsx (es un zip) sin dependencias: directorio central y descompresión deflate.
function parteXlsx(ruta, nombre) {
  const zip = readFileSync(ruta);
  let fin = zip.length - 22;
  while (zip.readUInt32LE(fin) !== 0x06054b50) fin--;
  for (let i = 0, p = zip.readUInt32LE(fin + 16); i < zip.readUInt16LE(fin + 10); i++) {
    const largoNombre = zip.readUInt16LE(p + 28), extra = zip.readUInt16LE(p + 30), coment = zip.readUInt16LE(p + 32);
    if (zip.toString('utf8', p + 46, p + 46 + largoNombre) === nombre) {
      const local = zip.readUInt32LE(p + 42), inicio = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      const datos = zip.subarray(inicio, inicio + zip.readUInt32LE(p + 20));
      return (zip.readUInt16LE(p + 10) ? inflateRawSync(datos) : datos).toString('utf8');
    }
    p += 46 + largoNombre + extra + coment;
  }
  throw new Error('No está ' + nombre);
}

const RUTA = 'plantilla/planilla-comercio.xlsx';
const libro = parteXlsx(RUTA, 'xl/workbook.xml');
const hojas = [...libro.matchAll(/<sheet [^>]*name="([^"]+)"/g)].map(m => m[1]);
const hoja = nombre => parteXlsx(RUTA, `xl/worksheets/sheet${hojas.indexOf(nombre) + 1}.xml`);
const formulas = (xml, col) => [...xml.matchAll(new RegExp(`<c r="${col}(\\d+)"[^>]*><f>([^<]*)</f>`, 'g'))].map(m => m[2].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)));

test('SPEC §3 la plantilla tiene las pestañas Productos, Ajustes y Web', () => {
  for (const h of ['Productos', 'Ajustes', 'Web']) assert.ok(hojas.includes(h), h);
});

test('BR-PRE-001 en la pestaña Web, Precio y Precio anterior se copian solo si Ajustes > Precios es SÍ', () => {
  const web = hoja('Web');
  for (const col of ['E', 'F']) {
    const fs = formulas(web, col);
    assert.ok(fs.length >= 3000, `${col}: ${fs.length} filas`);
    for (const f of fs) assert.match(f, /^IF\(AND\(AND\(.*\),OR\(UPPER\(TRIM\(IFERROR\(VLOOKUP\("Precios",Ajustes!\$A:\$B,2,FALSE\),""\)\)\)="SÍ",.*="SI"\)\),INDEX\(Productos!/);
  }
});

test('BR-PRE-001 ninguna otra columna de Web copia Precio ni Precio anterior', () => {
  const web = hoja('Web');
  for (const col of ['A', 'B', 'C', 'D', 'G']) for (const f of formulas(web, col)) assert.doesNotMatch(f, /INDEX\(Productos!\$[EF]:/);
});

test('AC-010-2 y AC-010-3 cada fila de Web queda vacía si en Productos no tiene nombre o tiene Visible = NO', () => {
  const web = hoja('Web');
  for (const col of ['A', 'B', 'C', 'D', 'E', 'F', 'G'])
    for (const f of formulas(web, col).slice(0, 50))
      assert.ok(f.includes('INDEX(Productos!$B:$B,ROW())<>""') && f.includes('UPPER(TRIM(INDEX(Productos!$H:$H,ROW())))<>"NO"'), f);
});

test('SPEC §3 la pestaña Web no publica la columna Visible', () => {
  assert.doesNotMatch(hoja('Web'), /Productos!\$H:\$H,ROW\(\)\)&""/);
});
