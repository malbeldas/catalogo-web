// QR de reseñas del cliente (UC-023, AC-023-1): resena.html lleva directo al formulario de Google, sin ofrecer nada a
// cambio ni preguntar estrellas antes. Viene de la base y se reemplaza en cada actualización del núcleo.
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

const tienda = JSON.parse(readFileSync(new URL('../tienda.json', import.meta.url), 'utf8'));

test('AC-023-1 resena.html lleva directo a la reseña de Google, sin regalos ni estrellas', async ({ page }) => {
  test.skip(!tienda.resenas, 'el comercio no tiene QR de reseñas');
  // Nada sale de la máquina: Google y GA4 se cortan, y se anota adónde quiso ir.
  const externas = [];
  await page.route(u => !['localhost', '127.0.0.1'].includes(u.hostname), r => { externas.push(r.request().url()); return r.abort('blockedbyclient'); });
  await page.goto('resena.html?o=qr', { waitUntil: 'domcontentloaded' }).catch(() => {});
  await expect.poll(() => externas.find(u => u.startsWith(tienda.resenas.split('?')[0])), { timeout: 5000 }).toBeTruthy();
  // Lo que dice la página, sin el código: nada a cambio de la reseña (política de Google).
  const html = await (await page.request.get('resena.html')).text();
  const texto = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, ' ');
  expect(texto).not.toMatch(/descuento|regalo|sorteo|premio|% ?off|estrellas/i);
});
