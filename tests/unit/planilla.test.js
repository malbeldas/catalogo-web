import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leerCSV, leerPrecio, linkFoto, productosDesdeFilas, productosDesdeCSV } from '../../core/datos.js';

const TITULOS = 'Código,Nombre,Categoría,Descripción,Precio,Precio anterior,Foto,Visible';
const csv = (...filas) => [TITULOS, ...filas].join('\n');

test('formato: el CSV entiende comillas, comas y saltos de línea dentro de una celda', () => {
  assert.deepEqual(leerCSV('a,b,c\n"Tira, 5 m","Dice ""LED""","línea 1\nlínea 2"\n'), [
    ['a', 'b', 'c'],
    ['Tira, 5 m', 'Dice "LED"', 'línea 1\nlínea 2'],
  ]);
});

test('formato: el CSV acepta saltos de Windows, celdas vacías y la marca BOM', () => {
  assert.deepEqual(leerCSV('﻿a,b,c\r\n1,,3\r\n,,\r\n'), [['a', 'b', 'c'], ['1', '', '3'], ['', '', '']]);
  assert.deepEqual(leerCSV(''), []);
});

test('AC-010-1 cada fila con nombre es un producto con las columnas de la planilla', () => {
  assert.deepEqual(productosDesdeCSV(csv('G5,Guirnalda 5 m,Guirnaldas,Lista para enchufar,$ 14.900,$ 17.900,img/g5.jpg,SÍ')), [
    { id: 'G5', n: 'Guirnalda 5 m', cat: 'Guirnaldas', d: 'Lista para enchufar', p: 14900, antes: 17900, img: 'img/g5.jpg' },
  ]);
});

test('AC-010-2 un producto con Visible = NO queda afuera', () => {
  const ps = productosDesdeCSV(csv('A,Visible,,,,,,SÍ', 'B,Oculto,,,,,,NO', 'C,Oculto en minúscula,,,,,, no ', 'D,Visible sin acento,,,,,,SI'));
  assert.deepEqual(ps.map(p => p.id), ['A', 'D']);
});

test('AC-010-2 Visible vacío cuenta como SÍ, igual que si falta la columna', () => {
  assert.equal(productosDesdeCSV(csv('A,Sin marcar,,,,,,')).length, 1);
  assert.equal(productosDesdeCSV('Nombre\nGuirnalda').length, 1);
});

test('AC-010-3 una fila sin nombre se ignora y el resto sigue', () => {
  const ps = productosDesdeCSV(csv('A,Primero,,,1000,,,', 'B,,Lámparas,Sin nombre,2000,,,', 'C,   ,,,,,,', ',,,,,,,', 'D,Último,,,3000,,,'));
  assert.deepEqual(ps.map(p => p.n), ['Primero', 'Último']);
});

test('SPEC §5 el precio acepta "$ 14.900" y "14900"', () => {
  assert.equal(leerPrecio('$ 14.900'), 14900);
  assert.equal(leerPrecio('14900'), 14900);
  assert.equal(leerPrecio('$14.900,00'), 14900);
  assert.equal(leerPrecio('14,900.00'), 14900);
  assert.equal(leerPrecio('1.234.567'), 1234567);
  assert.equal(leerPrecio('8900,50'), 8900.5);
});

test('SPEC §5 un precio no numérico queda sin precio ("Consultar")', () => {
  for (const v of ['a consultar', '', '   ', '$', '0', '-500', undefined]) assert.equal(leerPrecio(v), null, String(v));
  assert.equal(productosDesdeCSV(csv('A,Reflector,,,a consultar,,,'))[0].p, null);
});

test('SPEC §5 el precio anterior solo se usa si es mayor que el precio', () => {
  const [a, b, c] = productosDesdeCSV(csv('A,Con oferta,,,9000,12000,,', 'B,Anterior menor,,,9000,8000,,', 'C,Sin precio,,,consultar,12000,,'));
  assert.equal(a.antes, 12000);
  assert.equal(b.antes, null);
  assert.equal(c.antes, null);
});

test('SPEC §5 de un código repetido gana la primera fila', () => {
  const ps = productosDesdeCSV(csv('X1,Primera,,,1000,,,', 'X1,Repetida,,,2000,,,', 'X2,Otra,,,,,,'));
  assert.deepEqual(ps.map(p => p.n), ['Primera', 'Otra']);
});

test('SPEC §3 sin código se usa el número de fila de la planilla', () => {
  const ps = productosDesdeCSV(csv(',Sin código,,,,,,', 'B,Con código,,,,,,', ',Otro sin código,,,,,,'));
  assert.deepEqual(ps.map(p => p.id), ['fila-2', 'B', 'fila-4']);
});

test('formato: las columnas se reconocen sin importar mayúsculas, acentos, espacios ni orden', () => {
  const ps = productosDesdeFilas([['  FOTO ', 'precio  ANTERIOR', 'categoria', 'NOMBRE', 'Descripcion', 'codigo', 'Precio', 'Otra columna'],
    ['img/a.jpg', '2000', 'Tiras', 'Tira LED', 'Rollo de 5 m', 'T1', '1500', 'se ignora']]);
  assert.deepEqual(ps, [{ id: 'T1', n: 'Tira LED', cat: 'Tiras', d: 'Rollo de 5 m', p: 1500, antes: 2000, img: 'img/a.jpg' }]);
});

test('formato: las celdas se limpian de espacios y una fila corta no rompe nada', () => {
  assert.deepEqual(productosDesdeCSV(csv(' A ,  Guirnalda  ')), [{ id: 'A', n: 'Guirnalda', cat: '', d: '', p: null, antes: null, img: '' }]);
});

test('formato: los links compartidos de Drive se convierten en link de imagen', () => {
  const id = '1AbC-dEf_GhIjKlMnOpQrStUvWxYz0123';
  const foto = `https://drive.google.com/thumbnail?id=${id}&sz=w800`;
  for (const v of [`https://drive.google.com/file/d/${id}/view?usp=sharing`, `https://drive.google.com/file/d/${id}/view`,
    `https://drive.google.com/open?id=${id}`, `https://drive.google.com/uc?export=view&id=${id}`,
    `https://docs.google.com/uc?id=${id}`, `https://drive.google.com/thumbnail?id=${id}`, `  https://drive.google.com/file/d/${id}/view  `]) assert.equal(linkFoto(v), foto, v);
});

test('formato: una URL de imagen o una ruta del sitio quedan como están', () => {
  assert.equal(linkFoto('https://i.imgur.com/abc.jpg'), 'https://i.imgur.com/abc.jpg');
  assert.equal(linkFoto('http://ejemplo.com/foto.png?x=1'), 'http://ejemplo.com/foto.png?x=1');
  assert.equal(linkFoto('img/guirnalda.jpg'), 'img/guirnalda.jpg');
});

test('seguridad: un link de foto vacío, de Drive sin archivo o con otro esquema no se usa', () => {
  for (const v of ['', '   ', undefined, 'https://drive.google.com/drive/folders', 'javascript:alert(1)', 'JavaScript:alert(1)', 'data:image/png;base64,AAA', '//otro.sitio/foto.jpg'])
    assert.equal(linkFoto(v), '', String(v));
});
