// AC-010-5 — Planilla privada: el comercio solo comparte su archivo y la web muestra la copia que arma la tarea respaldo
// (SPEC.md §3, §4). La web no le pide nada a Google.
import { test, expect, simularCatalogo, servirRespaldo } from './ayudas.js';

const copia = {
  productos: [
    { id: 'A1', n: 'Alfajor triple', cat: 'Golosinas', d: '', p: null, antes: null, img: '' },
    { id: 'B1', n: 'Jugo de naranja', cat: 'Bebidas', d: '', p: null, antes: null, img: '' },
  ],
  ajustes: { nombre: 'Kiosco del archivo', wa: '5491122223333', precios: false },
};
const tienda = { nombre: 'Kiosco del alta', wa: '5491100000000', precios: true, productos: undefined, planilla: { privada: true } };

test('AC-010-5 con planilla privada la web muestra la copia de la tarea respaldo con sus ajustes, sin pedir nada a Google', async ({ page, externas }) => {
  const respaldo = await servirRespaldo(page, copia);
  await simularCatalogo(page, tienda);
  await page.goto('/tienda.html?t=pled&demo=0');
  await expect(page.locator('#grid .pc h3')).toHaveText(['Alfajor triple', 'Jugo de naranja']);
  await expect(page.locator('#stName')).toHaveText('Kiosco del archivo');
  expect(respaldo.pedidos).toBe(1);
  // Precios = NO en el archivo: ningún importe en la página (BR-PRE-001).
  await expect(page.locator('body')).not.toContainText('$');
  await page.locator('#grid .pc').first().locator('button[data-a="+"]').tap();
  await page.locator('#cartbar').tap();
  await page.locator('#sendOrder').tap();
  await expect.poll(() => externas.find(u => u.startsWith('https://wa.me/'))).toMatch(/^https:\/\/wa\.me\/5491122223333\?text=/);
  expect(externas.filter(u => /docs\.google|drive\.google/.test(u))).toEqual([]);
});

test('AC-010-5 con planilla privada y sin copia todavía se ve "Estamos actualizando el catálogo" y WhatsApp del alta', async ({ page }) => {
  await servirRespaldo(page, null);
  await simularCatalogo(page, tienda);
  await page.goto('/tienda.html?t=pled&demo=0');
  await expect(page.locator('#empty')).toContainText('Estamos actualizando el catálogo');
  await expect(page.locator('#q')).toBeHidden();
  await expect(page.locator('#waDirecto')).toHaveAttribute('href', /^https:\/\/wa\.me\/5491100000000\?/);
});
