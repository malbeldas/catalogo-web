// UC-021 — Repo de un cliente: la página dice cuál es su tienda.json y la URL no puede cambiarla (SPEC.md §4, §6).
import { readFileSync } from 'node:fs';
import { test, expect } from './ayudas.js';

const base = readFileSync(new URL('../../tienda.html', import.meta.url), 'utf8');
const cliente = { id: 'kiosco', nombre: 'Kiosco Ana', bajada: 'Golosinas y bebidas', color: '#7c3aed', wa: '5491122223333', precios: true,
  productos: [{ id: 'a1', n: 'Alfajor triple', p: 900 }, { id: 'a2', n: 'Agua 500 ml', p: 700 }] };

// Simula el index.html de un cliente: el mismo catálogo con data-tienda, y su tienda.json en la raíz.
async function abrirCliente(page, url) {
  const pedidos = [];
  page.on('request', r => pedidos.push(new URL(r.url()).pathname));
  await page.route('**/cliente.html*', r => r.fulfill({ body: base.replace('<html lang="es-AR">', '<html lang="es-AR" data-tienda="tienda.json">'), contentType: 'text/html' }));
  await page.route('**/tienda.json', r => r.fulfill({ json: cliente }));
  await page.goto(url);
  await expect(page.locator('#stName')).toHaveText('Kiosco Ana');
  return pedidos;
}

test('AC-021-1 el catálogo de un cliente sale de su tienda.json', async ({ page, externas }) => {
  const pedidos = await abrirCliente(page, '/cliente.html');
  await expect(page.locator('#grid .pc h3')).toHaveText(['Alfajor triple', 'Agua 500 ml']);
  expect(pedidos.filter(p => p.includes('/tiendas/'))).toEqual([]);
  await page.locator('#grid .pc').first().locator('button[data-a="+"]').tap();
  await page.locator('#cartbar').tap();
  await page.locator('#sendOrder').tap();
  await expect.poll(() => externas.some(u => u.startsWith('https://wa.me/5491122223333?text='))).toBe(true);
});

test('AC-020-1 en el repo de un cliente la URL no abre otro comercio ni la demo', async ({ page }) => {
  const pedidos = await abrirCliente(page, '/cliente.html?t=pueyrredon&demo=1');
  await expect(page.locator('#grid .pc h3')).toHaveText(['Alfajor triple', 'Agua 500 ml']);
  await expect(page.locator('#demobar')).toHaveCount(0);
  expect(pedidos.filter(p => p.includes('/tiendas/') || p.endsWith('/demo.js'))).toEqual([]);
});
