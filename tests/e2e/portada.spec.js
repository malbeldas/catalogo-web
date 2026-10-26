// UC-024 — Portada de venta: qué incluye, precio y consulta por WhatsApp (SPEC.md §2).
import { readFileSync } from 'node:fs';
import { test, expect } from './ayudas.js';
import { money } from '../../core/datos.js';

const portada = JSON.parse(readFileSync(new URL('../../portada.json', import.meta.url), 'utf8'));
const WA = `https://wa.me/5491160132068?text=${encodeURIComponent(portada.mensaje)}`;

test('AC-024-1 la portada muestra qué incluye, el alta y el abono de portada.json', async ({ page }) => {
  await page.goto('/');
  const precio = page.locator('#precio');
  await expect(precio).toBeVisible();
  await expect(precio.locator('h2')).toHaveText('Qué incluye y cuánto sale');
  await expect(page.locator('#incluye li')).toHaveText(portada.incluye);
  await expect(page.locator('#alta')).toHaveText(money(portada.alta.precio));
  await expect(page.locator('#alta')).toHaveText('$39.900');
  await expect(page.locator('#altaDetalle')).toHaveText(`con hasta ${portada.alta.productos} productos cargados`);
  await expect(page.locator('#abono')).toHaveText('$5.900');
  await expect(precio).toContainText('por mes');
  await expect(page.locator('#oferta')).toHaveText(portada.oferta);
  // Mobile first (regla hard 6): nada se sale de los 375 px.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test('AC-024-1 si portada.json no carga, la portada sigue con los ejemplos y sin un bloque a medias', async ({ page }) => {
  await page.route('**/portada.json', r => r.fulfill({ status: 404 }));
  await page.goto('/');
  await expect(page.locator('.go a')).toHaveCount(5);
  await expect(page.locator('#precio')).toBeHidden();
});

test('AC-024-2 el botón abre WhatsApp al número de ventas con el mensaje armado', async ({ page, externas }) => {
  await page.goto('/');
  const boton = page.locator('#consultar');
  await expect(boton).toHaveText('Consultar por WhatsApp');
  await expect(boton).toHaveAttribute('href', WA);
  await boton.tap();
  await expect.poll(() => externas).toContain(WA);
});

test('AC-024-3 la portada no nombra a Pueyrredón ni a PLED fuera de los ejemplos, ni usa "Mostrador"', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#precio')).toBeVisible();
  const otraMarca = /pueyrred[oó]n|\bpled\b|mostrador/i;
  // Fuera de los links a los ejemplos: texto visible, título y descripción, y lo que dice el mensaje de ventas.
  const textos = await page.evaluate(() => {
    const copia = document.querySelector('main').cloneNode(true);
    copia.querySelectorAll('.go').forEach(e => e.remove());
    return [copia.innerText, document.title, document.querySelector('meta[name=description]').content, decodeURIComponent(document.querySelector('#consultar').href)];
  });
  for (const t of textos) expect(t).not.toMatch(otraMarca);
  expect(JSON.stringify(portada)).not.toMatch(otraMarca);
  expect(await page.content()).not.toMatch(/mostrador/i);
});

test('humo: la portada no lleva noindex, así Google la puede mostrar', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('meta[name=robots]')).toHaveCount(0);
});
