// UC-021 — Alta de un cliente de punta a punta: scripts/alta.mjs arma su carpeta y se abre como la vería un comprador.
import { mkdtemp, readFile, writeFile, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, expect, URL_PLANILLA, URL_AJUSTES, aCSV, ajustesCSV } from './ayudas.js';
import { armarAlta } from '../../scripts/alta.mjs';
import { verificarAlta } from '../../scripts/verificar-alta.mjs';

const tienda = { id: 'kiosco', nombre: 'Kiosco Ana', bajada: 'Golosinas y bebidas', tipo: 'Minorista', logo: 'img/logo.jpg', logoCuadrado: true,
  color: '#7c3aed', wa: '5491100000000', precios: true, planilla: { web: URL_PLANILLA, ajustes: URL_AJUSTES } };
const filas = [['A1', 'Alfajor triple', 'Golosinas', 'Chocolate', '900', '', '', ''], ['B1', 'Agua 500 ml', 'Bebidas', '', '700', '', '', '']];
const web = aCSV(filas), ajustes = ajustesCSV([['WhatsApp', '5491122223333'], ['Precios', 'SÍ']]);
const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg' };

let dir;
test.beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'alta-e2e-'));
  await writeFile(join(dir, 'tienda.json'), JSON.stringify(tienda));
  await armarAlta(dir);
  await copyFile(new URL('../../img/ficticias/diet-almendras.jpg', import.meta.url), join(dir, 'img', 'logo.jpg'));
});

// La carpeta generada se sirve en /cliente-nuevo/, como si fuera la raíz de su GitHub Pages.
async function abrirCliente(page) {
  const pedidos = [];
  page.on('request', r => pedidos.push(r.url()));
  await page.route('**/cliente-nuevo/**', async r => {
    const ruta = new URL(r.request().url()).pathname.replace('/cliente-nuevo/', '') || 'index.html';
    try { return r.fulfill({ body: await readFile(join(dir, ruta)), contentType: tipos[ruta.slice(ruta.lastIndexOf('.'))] }); }
    catch { return r.fulfill({ status: 404 }); }
  });
  await page.route(URL_PLANILLA, r => r.fulfill({ body: web, contentType: 'text/csv' }));
  await page.route(URL_AJUSTES, r => r.fulfill({ body: ajustes, contentType: 'text/csv' }));
  await page.goto('/cliente-nuevo/');
  await expect(page.locator('#stName')).toHaveText('Kiosco Ana');
  return pedidos;
}

test('AC-021-1 el cliente recién dado de alta muestra su marca y su planilla, y pide a su WhatsApp', async ({ page, externas }) => {
  await abrirCliente(page);
  await expect(page).toHaveTitle(/Kiosco Ana/);
  await expect(page.locator('#stSub')).toHaveText('Golosinas y bebidas');
  await expect(page.locator('#stLogo img')).toHaveAttribute('src', 'img/logo.jpg');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--brand').trim())).toBe('#7c3aed');
  await expect(page.locator('#grid .pc h3')).toHaveText(['Alfajor triple', 'Agua 500 ml']);
  await page.locator('#grid .pc').first().locator('button[data-a="+"]').tap();
  await page.locator('#cartbar').tap();
  await page.locator('#sendOrder').tap();
  // El WhatsApp de Ajustes pisa el de tienda.json (SPEC.md §3).
  await expect.poll(() => externas.find(u => u.startsWith('https://wa.me/'))).toMatch(/^https:\/\/wa\.me\/5491122223333\?text=/);
});

test('AC-021-1 la carpeta generada pasa la verificación del alta: core/ igual a la base', async () => {
  const fetch = async url => ({ ok: true, text: async () => url === URL_PLANILLA ? web : ajustes });
  expect(await verificarAlta(dir, { fetch })).toEqual([]);
});

test('regla hard 7: el cliente no muestra ni pide nada de otra marca, de la demo ni de la portada', async ({ page }) => {
  const pedidos = await abrirCliente(page);
  expect(await page.content()).not.toMatch(/pueyrred[oó]n|\bpled\b|mostrador/i);
  await expect(page.locator('#demobar')).toHaveCount(0);
  const locales = pedidos.filter(u => new URL(u).hostname === 'localhost').map(u => new URL(u).pathname);
  expect(locales.filter(p => !p.startsWith('/cliente-nuevo/'))).toEqual([]);
  expect(locales.filter(p => /tiendas\/|demo\.js|tienda\.html/.test(p))).toEqual([]);
  await page.screenshot({ path: 'test-results/issue-61-cliente.png' });
});
