// portada.json: los datos de venta de la portada (UC-024), que se cambian sin tocar index.html.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { linkWhatsApp } from '../../core/datos.js';

const portada = JSON.parse(readFileSync(new URL('../../portada.json', import.meta.url), 'utf8'));

test('AC-024-1 portada.json trae qué incluye, el alta y el abono en pesos enteros', () => {
  assert.ok(Array.isArray(portada.incluye) && portada.incluye.length > 0);
  for (const t of portada.incluye) assert.ok(typeof t === 'string' && t.trim());
  assert.ok(Number.isInteger(portada.alta.precio) && portada.alta.precio > 0);
  assert.ok(Number.isInteger(portada.alta.productos) && portada.alta.productos > 0);
  assert.ok(Number.isInteger(portada.abono) && portada.abono > 0);
});

test('AC-024-2 el número de ventas arma un link de wa.me con el mensaje', () => {
  assert.equal(portada.whatsapp, '5491160132068');
  assert.ok(portada.mensaje.trim());
  assert.equal(linkWhatsApp(portada.whatsapp, portada.mensaje), `https://wa.me/5491160132068?text=${encodeURIComponent(portada.mensaje)}`);
});
