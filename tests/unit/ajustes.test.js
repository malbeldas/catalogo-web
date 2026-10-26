import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ajustesDesdeFilas, ajustesDesdeCSV, aplicarAjustes, mensajePedido } from '../../core/datos.js';

const tienda = { id: 'demo', nombre: 'Nombre del alta', bajada: 'Bajada del alta', wa: '5491100000000', precios: true,
  productos: [{ id: 'g5', n: 'Guirnalda 5 m', p: 14900, antes: 17900 }, { id: 'l1', n: 'Lámpara G125', p: 8900, antes: null }] };
const ajustesCSV = (...filas) => ['Ajuste,Valor,Para qué sirve', ...filas].join('\n');

test('formato: Ajustes se lee en filas "Ajuste | Valor" y se ignora la columna de ayuda', () => {
  assert.deepEqual(ajustesDesdeCSV(ajustesCSV('WhatsApp,5491176033649,Con código de país', 'Precios,NO,Muestra precios', 'Nombre,Luz Norte,', 'Bajada,"Iluminación, cables y más",')),
    { wa: '5491176033649', precios: false, nombre: 'Luz Norte', bajada: 'Iluminación, cables y más' });
});

test('formato: Precios acepta SÍ, SI, Sí y NO sin importar mayúsculas ni espacios', () => {
  for (const v of ['SÍ', 'SI', 'Sí', 'si', ' sí ']) assert.equal(ajustesDesdeFilas([['Precios', v]]).precios, true, v);
  for (const v of ['NO', 'no', ' No ']) assert.equal(ajustesDesdeFilas([['Precios', v]]).precios, false, v);
  assert.equal('precios' in ajustesDesdeFilas([['Precios', 'tal vez']]), false);
});

test('formato: los nombres de los ajustes se reconocen sin importar mayúsculas ni acentos', () => {
  assert.deepEqual(ajustesDesdeFilas([[' whatsapp ', '549111'], ['PRECIOS', 'sí'], ['nombre', 'X']]), { wa: '549111', precios: true, nombre: 'X' });
});

test('UC-011 escenario 4: WhatsApp, Nombre y Bajada de Ajustes reemplazan los de tienda.json', () => {
  const t = aplicarAjustes(tienda, ajustesDesdeFilas([['WhatsApp', '5491176033649'], ['Nombre', 'Luz Norte'], ['Bajada', 'Nueva bajada']]));
  assert.equal(t.wa, '5491176033649');
  assert.equal(t.nombre, 'Luz Norte');
  assert.equal(t.bajada, 'Nueva bajada');
});

test('UC-011 escenario 4: un ajuste vacío deja el valor de tienda.json', () => {
  const t = aplicarAjustes(tienda, ajustesDesdeCSV(ajustesCSV('WhatsApp,,', 'Precios,,', 'Nombre,   ,', 'Bajada,,')));
  assert.equal(t.wa, tienda.wa);
  assert.equal(t.nombre, tienda.nombre);
  assert.equal(t.bajada, tienda.bajada);
  assert.equal(t.precios, true);
});

test('AC-011-1 con Precios = NO ningún producto queda con precio ni precio anterior', () => {
  const t = aplicarAjustes(tienda, ajustesDesdeFilas([['Precios', 'NO']]));
  assert.equal(t.precios, false);
  for (const p of t.productos) {
    assert.equal(p.p, null, p.n);
    assert.equal(p.antes, null, p.n);
  }
  assert.equal(tienda.productos[0].p, 14900, 'no modifica la tienda original');
});

test('AC-011-1 con precios ocultos en tienda.json y sin Ajustes también se sacan los importes', () => {
  const t = aplicarAjustes({ ...tienda, precios: false });
  assert.ok(t.productos.every(p => p.p === null && p.antes === null));
});

test('AC-011-2 con Precios = SÍ los productos conservan sus precios', () => {
  const t = aplicarAjustes({ ...tienda, precios: false }, ajustesDesdeFilas([['Precios', 'SÍ']]));
  assert.equal(t.precios, true);
  assert.deepEqual(t.productos.map(p => p.p), [14900, 8900]);
});

test('AC-002-3 con precios ocultos el mensaje dice "Quiero consultar precio de" y no tiene importes', () => {
  const t = aplicarAjustes(tienda, { precios: false });
  const msg = mensajePedido([{ p: t.productos[0], q: 2 }, { p: t.productos[1], q: 1 }], { comercio: t.nombre, precios: t.precios, comprador: 'Juan' });
  assert.equal(msg, 'Hola Nombre del alta! Quiero consultar precio de:\n• 2 × Guirnalda 5 m\n• 1 × Lámpara G125\nSoy Juan.');
  assert.doesNotMatch(msg, /\$|\d{3}\.\d{3}|Total/);
});

test('AC-002-3 aunque los productos tengan precio, el mensaje con precios ocultos no tiene importes', () => {
  const msg = mensajePedido([{ p: tienda.productos[0], q: 3 }], { comercio: 'X', precios: false });
  assert.equal(msg, 'Hola X! Quiero consultar precio de:\n• 3 × Guirnalda 5 m');
});
