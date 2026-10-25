import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sinAcentos, esc, money, categorias, mostrarBarraCategorias, buscar, lote, LOTE } from '../../core/datos.js';

const P = [
  { id: 'a', n: 'Lámpara vintage G125', cat: 'Lámparas', d: 'Filamento ámbar E27' },
  { id: 'b', n: 'Guirnalda 5 m', cat: 'Guirnaldas', d: 'Lista para enchufar' },
  { id: 'c', n: 'Listón con sensor', cat: 'Sensores', d: 'Se enciende al pasar la mano' },
  { id: 'd', n: 'Guirnalda 10 m', cat: 'Guirnaldas', d: 'Con 10 lámparas gota' },
];

test('AC-001-1 la búsqueda ignora acentos: "lampara" encuentra "Lámpara"', () => {
  assert.deepEqual(buscar(P, 'lampara').map(p => p.id), ['a', 'd']);
});

test('AC-001-1 la búsqueda ignora mayúsculas', () => {
  assert.deepEqual(buscar(P, 'GUIRNALDA').map(p => p.id), ['b', 'd']);
  assert.equal(sinAcentos('ÁMBAR Ñandú'), 'ambar nandu');
});

test('AC-001-1 la búsqueda también encuentra palabras de la descripción', () => {
  assert.deepEqual(buscar(P, 'pasar la mano').map(p => p.id), ['c']);
});

test('AC-001-1 sin texto se ven todos y los espacios de más no cuentan', () => {
  assert.equal(buscar(P, '').length, 4);
  assert.deepEqual(buscar(P, '  sensor  ').map(p => p.id), ['c']);
});

test('AC-001-1 la búsqueda respeta la categoría elegida', () => {
  assert.deepEqual(buscar(P, 'lampara', 'Guirnaldas').map(p => p.id), ['d']);
  assert.deepEqual(buscar(P, '', 'Sensores').map(p => p.id), ['c']);
});

test('AC-001-1 si cambia el nombre de un producto, la búsqueda usa el nombre nuevo', () => {
  const p = { id: 'x', n: 'Reflector 50 W', cat: 'Reflectores' };
  assert.equal(buscar([p], 'reflector').length, 1);
  p.n = 'Plafón LED';
  assert.equal(buscar([p], 'reflector').length, 0);
  assert.equal(buscar([p], 'plafon').length, 1);
});

test('AC-001-2 las categorías salen en el orden de la planilla, sin repetir', () => {
  assert.deepEqual(categorias(P), ['Lámparas', 'Guirnaldas', 'Sensores']);
});

test('AC-001-2 los productos sin categoría no agregan una vacía', () => {
  assert.deepEqual(categorias([{ n: 'x', cat: '' }, { n: 'y' }, { n: 'z', cat: 'Única' }]), ['Única']);
});

test('AC-001-2 con una sola categoría no se muestra la barra', () => {
  assert.equal(mostrarBarraCategorias(['Guirnaldas']), false);
  assert.equal(mostrarBarraCategorias([]), false);
  assert.equal(mostrarBarraCategorias(['Guirnaldas', 'Sensores']), true);
});

test('seguridad: esc escapa los caracteres que rompen el HTML', () => {
  assert.equal(esc('<img src=x onerror="a(\'b\')">&'), '&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;');
  assert.equal(esc(null), '');
});

test('formato: money redondea y usa puntos de miles', () => {
  assert.equal(money(14900), '$14.900');
  assert.equal(money(1234.6), '$1.235');
});

test('AC-001-3 lote devuelve de a 60 productos y la última tanda incompleta', () => {
  const muchos = Array.from({ length: 130 }, (_, i) => ({ id: 'p' + i }));
  assert.equal(LOTE, 60);
  assert.deepEqual(lote(muchos, 0).map(p => p.id).slice(0, 2), ['p0', 'p1']);
  assert.equal(lote(muchos, 0).length, 60);
  assert.equal(lote(muchos, 120).length, 10);
  assert.equal(lote(muchos, 130).length, 0);
});
