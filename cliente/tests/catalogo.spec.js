// Prueba de humo del catálogo publicado del cliente (SPEC.md §11): Chromium en un celular de 375 × 740, sin llamar a
// Google ni a WhatsApp. Viene de la base y se reemplaza en cada actualización del núcleo.
import { readFileSync } from 'node:fs';
import { test as base, expect } from '@playwright/test';

const leer = f => { try { return JSON.parse(readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')); } catch { return null; } };
const tienda = leer('tienda.json');
const respaldo = leer('catalogo-respaldo.json');
const nombre = respaldo?.ajustes?.nombre || tienda.nombre;
const ocultos = (respaldo?.ajustes?.precios ?? tienda.precios) === false;

// Toda llamada fuera de la máquina se corta y queda anotada.
const test = base.extend({
  externas: async ({}, use) => { await use([]); },
  page: async ({ page, externas }, use) => {
    await page.route(u => !['localhost', '127.0.0.1'].includes(u.hostname), r => { externas.push(r.request().url()); return r.abort('blockedbyclient'); });
    await use(page);
  },
});

test('humo: el catálogo abre con el nombre del comercio y sus productos', async ({ page }) => {
  test.skip(!respaldo, 'todavía no hay catalogo-respaldo.json');
  await page.goto('./');
  await expect(page.locator('#stName')).toHaveText(nombre);
  await expect(page.locator('#grid .pc').first()).toBeVisible();
  // Mobile first (regla hard 6): nada se sale de los 375 px.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test('humo: la búsqueda encuentra un producto por su nombre', async ({ page }) => {
  test.skip(!respaldo, 'todavía no hay catalogo-respaldo.json');
  const buscado = respaldo.productos[0];
  await page.goto('./');
  await page.locator('#q').fill(buscado.n);
  await expect(page.locator('#grid .pc h3').first()).toHaveText(buscado.n);
});

test('BR-PRE-001 con precios ocultos no hay importes en la página ni en el pedido por WhatsApp', async ({ page, externas }) => {
  test.skip(!respaldo || !ocultos, 'el comercio muestra precios o todavía no hay copia');
  await page.goto('./');
  await expect(page.locator('#grid .pc').first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText('$');
  await page.locator('#grid .pc').first().locator('button[data-a="+"]').tap();
  await page.locator('#cartbar').tap();
  await page.locator('#sendOrder').tap();
  await expect.poll(() => externas.find(u => u.startsWith('https://wa.me/'))).toBeTruthy();
  expect(decodeURIComponent(externas.find(u => u.startsWith('https://wa.me/')))).not.toContain('$');
});
