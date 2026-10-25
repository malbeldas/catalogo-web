import { test } from 'node:test';
import assert from 'node:assert/strict';
import { totalPedido, mensajePedido, numeroWhatsApp, linkWhatsApp } from '../../core/datos.js';

const guirnalda = { id: 'g5', n: 'Guirnalda 5 m', p: 14900 };
const lampara = { id: 'l1', n: 'Lámpara vintage G125', p: 8900 };
const sinPrecio = { id: 'x', n: 'Reflector a pedido' };
const pedido = [{ p: guirnalda, q: 2 }, { p: lampara, q: 1 }];

test('AC-002-1 el link abre wa.me con el número y el mensaje codificado', () => {
  assert.equal(linkWhatsApp('5491176033649', 'Hola! ¿Tenés 2 × G125?'),
    'https://wa.me/5491176033649?text=Hola!%20%C2%BFTen%C3%A9s%202%20%C3%97%20G125%3F');
});

test('AC-002-1 el número se limpia de espacios, guiones y +', () => {
  assert.equal(numeroWhatsApp('+54 9 11 7603-3649'), '5491176033649');
  assert.equal(linkWhatsApp('+54 9 11 7603-3649', 'x'), 'https://wa.me/5491176033649?text=x');
});

test('AC-002-1 sin número no hay link', () => {
  assert.equal(linkWhatsApp('', 'x'), null);
  assert.equal(linkWhatsApp(undefined, 'x'), null);
  assert.equal(linkWhatsApp('sin número', 'x'), null);
});

test('AC-002-1 los saltos de línea, el & y los emojis viajan codificados', () => {
  const url = new URL(linkWhatsApp('5491100000000', 'Luz & sombra\n• 1 × Foco 💡'));
  assert.equal(url.searchParams.get('text'), 'Luz & sombra\n• 1 × Foco 💡');
});

test('AC-002-2 el mensaje lista cada producto con subtotal y el total estimado', () => {
  assert.equal(mensajePedido(pedido, { comercio: 'PLED', precios: true }), [
    'Hola PLED! Quiero hacer este pedido:',
    '• 2 × Guirnalda 5 m ($29.800)',
    '• 1 × Lámpara vintage G125 ($8.900)',
    'Total estimado: $38.700',
  ].join('\n'));
});

test('AC-002-2 un producto sin precio va sin importe y no suma al total', () => {
  const m = mensajePedido([...pedido, { p: sinPrecio, q: 3 }], { comercio: 'PLED', precios: true });
  assert.match(m, /^• 3 × Reflector a pedido$/m);
  assert.match(m, /Total estimado: \$38\.700/);
  assert.equal(totalPedido([...pedido, { p: sinPrecio, q: 3 }], true), 38700);
});

test('AC-002-2 sin ningún precio no aparece la línea de total', () => {
  assert.doesNotMatch(mensajePedido([{ p: sinPrecio, q: 1 }], { precios: true }), /Total/);
});

test('AC-002-4 con nombre el mensaje termina en "Soy <nombre>."', () => {
  const m = mensajePedido(pedido, { comercio: 'PLED', precios: true, comprador: '  Juan ' });
  assert.ok(m.endsWith('\nSoy Juan.'));
});

test('AC-002-4 sin nombre no queda una línea vacía ni "Soy"', () => {
  const m = mensajePedido(pedido, { comercio: 'PLED', precios: true, comprador: '   ' });
  assert.doesNotMatch(m, /Soy|\n\n|\n$/);
});

test('AC-002-2 sin nombre del comercio el saludo queda bien escrito', () => {
  assert.ok(mensajePedido(pedido, { precios: true }).startsWith('Hola! Quiero hacer este pedido:'));
});
