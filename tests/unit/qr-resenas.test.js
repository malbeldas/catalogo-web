// UC-023 — Tarjeta del QR de reseñas: scripts/qr-resenas.mjs (SPEC.md §2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { urlResena, tarjetaHTML, generarTarjetas } from '../../scripts/qr-resenas.mjs';

test('UC-023 el QR apunta a resena.html del catálogo del cliente', () => {
  assert.equal(urlResena('https://kiosco-ana.github.io/catalogo/'), 'https://kiosco-ana.github.io/catalogo/resena.html');
  assert.equal(urlResena('https://kiosco-ana.github.io/catalogo'), 'https://kiosco-ana.github.io/catalogo/resena.html');
  assert.equal(urlResena('https://kiosco-ana.github.io/'), 'https://kiosco-ana.github.io/resena.html');
  assert.equal(urlResena(' https://kiosco-ana.github.io/catalogo/index.html '), 'https://kiosco-ana.github.io/catalogo/resena.html');
  for (const mal of ['', 'kiosco-ana.github.io', 'http://kiosco-ana.github.io/', 'https://x.github.io/?t=1', null]) assert.equal(urlResena(mal), null, String(mal));
});

test('AC-023-2 la tarjeta lleva el logo, el color y el nombre del comercio, y nada de otra marca ni nada a cambio', () => {
  const t = tarjetaHTML({ nombre: 'Kiosco <Ana>', color: '#7c3aed', logo: 'data:image/png;base64,AAAA', qr: '<svg id="qr"></svg>' });
  assert.match(t, /--marca:#7c3aed;--sobre-marca:#fff/);
  assert.match(t, /<img class="logo" src="data:image\/png;base64,AAAA"/);
  assert.match(t, /Kiosco &lt;Ana&gt;/);
  assert.match(t, /<svg id="qr"><\/svg>/);
  assert.match(t, /Dejanos tu reseña en Google/);
  assert.doesNotMatch(t, /pueyrred[oó]n|\bpled\b|mostrador/i);
  assert.doesNotMatch(t, /descuento|regalo|OFF|%|beneficio|estrella|★/i);
  // Un color claro lleva texto oscuro; uno inválido usa el gris por defecto; sin logo no hay imagen.
  assert.match(tarjetaHTML({ color: '#ffcc33' }), /--sobre-marca:#111/);
  assert.match(tarjetaHTML({ color: 'rojo' }), /--marca:#1f2937/);
  assert.doesNotMatch(tarjetaHTML({}), /<img/);
});

test('UC-023 sin link de reseña o sin URL https del catálogo no se genera la tarjeta', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'qr-'));
  await writeFile(join(dir, 'tienda.json'), JSON.stringify({ nombre: 'Kiosco Ana' }));
  await assert.rejects(generarTarjetas(dir, 'https://x.github.io/', join(dir, 'out')), /no tiene resenas/);
  await writeFile(join(dir, 'tienda.json'), JSON.stringify({ nombre: 'Kiosco Ana', resenas: 'https://g.page/r/CaAbC123xyz/review' }));
  await assert.rejects(generarTarjetas(dir, 'x.github.io', join(dir, 'out')), /no es la URL https del catálogo/);
});
