// Tests del catálogo del cliente (SPEC.md §6, §11): vienen de la base y se reemplazan en cada actualización del núcleo.
// Revisan sus datos: tienda.json completo y, si ya hay copia de la planilla, que tenga productos y que con precios
// ocultos no traiga ningún importe (BR-PRE-001). Sin dependencias: node --test "tests/*.test.js"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { numeroWhatsApp } from '../core/datos.js';

const leer = async f => JSON.parse(await readFile(new URL(`../${f}`, import.meta.url), 'utf8'));
const tienda = await leer('tienda.json');
const respaldo = await leer('catalogo-respaldo.json').catch(() => null);

test('humo: tienda.json tiene nombre y un WhatsApp válido', () => {
  assert.ok(String(tienda.nombre || '').trim(), 'falta el nombre');
  assert.match(numeroWhatsApp(respaldo?.ajustes?.wa || tienda.wa), /^\d{10,15}$/, 'el WhatsApp no es válido');
});

test('humo: la copia de la planilla tiene productos con código y nombre', { skip: !respaldo && 'todavía no hay catalogo-respaldo.json' }, () => {
  assert.ok(Array.isArray(respaldo.productos) && respaldo.productos.length > 0, 'la copia no tiene productos');
  for (const p of respaldo.productos) assert.ok(p.id && p.n, `producto incompleto: ${JSON.stringify(p)}`);
});

test('BR-PRE-001 con precios ocultos la copia de la planilla no trae importes', { skip: !respaldo && 'todavía no hay catalogo-respaldo.json' }, () => {
  if ((respaldo.ajustes?.precios ?? tienda.precios) !== false) return;
  const conPrecio = respaldo.productos.filter(p => p.p != null || p.antes != null);
  assert.deepEqual(conPrecio.map(p => p.id), []);
});
