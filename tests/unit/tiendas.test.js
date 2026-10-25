// Test de humo: confirma que node:test corre en local y en CI.
// Valida las tiendas de ejemplo de la demo; los tests por AC llegan con core/datos.js (#14).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const dir = new URL('../../tiendas/', import.meta.url);
const tiendas = readdirSync(dir).filter(f => f.endsWith('.json'));

test('humo: hay tiendas de ejemplo', () => {
  assert.ok(tiendas.length > 0);
});

for (const f of tiendas) {
  test(`humo: ${f} es JSON válido con id, nombre y productos`, () => {
    const t = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
    assert.equal(t.id + '.json', f);
    assert.ok(t.nombre, "falta nombre");
    assert.ok(Array.isArray(t.productos) && t.productos.length > 0);
    for (const p of t.productos) assert.ok(p.n, `producto sin nombre en ${f}`);
  });
}
