// UC-023 — QR de reseñas: resena.html del cliente lleva directo a su formulario de reseña de Google (SPEC.md §2).
import { test, expect } from './ayudas.js';
import { paginaResena } from '../../scripts/alta.mjs';

const RESENA = 'https://g.page/r/CaAbC123xyz/review';
const servir = (page, tienda) => page.route('**/resena-cliente.html', r => r.fulfill({ body: paginaResena(tienda), contentType: 'text/html' }));

test('AC-023-1 al escanear el QR se abre el formulario de reseña de Google, sin pasos ni nada a cambio', async ({ page, externas }) => {
  await servir(page, { nombre: 'Kiosco Ana', resenas: RESENA });
  await page.goto('/resena-cliente.html').catch(() => {});
  await expect.poll(() => externas).toContain(RESENA);
  expect(externas.filter(u => /googletagmanager/.test(u))).toEqual([]);
});

test('AC-023-3 con GA4 el escaneo cuenta resena_qr y después va a Google aunque GA4 no responda', async ({ page, externas }) => {
  const capa = [];
  await page.exposeFunction('copiarCapa', a => capa.push(a));
  await page.addInitScript(() => {
    const capa = window.dataLayer = [];
    capa.push = function (a) { copiarCapa(JSON.stringify(Array.from(a))); return Array.prototype.push.call(this, a); };
  });
  await servir(page, { nombre: 'Kiosco Ana', resenas: RESENA, ga4: 'G-PRUEBA123' });
  await page.goto('/resena-cliente.html').catch(() => {});
  // GA4 está cortado en los tests: la página igual sale a Google al segundo.
  await expect.poll(() => externas).toContain(RESENA);
  expect(externas).toContain('https://www.googletagmanager.com/gtag/js?id=G-PRUEBA123');
  expect(capa.join()).toContain('"resena_qr"');
  expect(capa.join()).not.toMatch(/Kiosco|g\.page/);
});
