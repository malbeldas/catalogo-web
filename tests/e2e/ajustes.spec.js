// UC-011 — Ajustes del comercio y precios ocultos (SPEC.md §2, §3, §5 BR-PRE-001).
import { test, expect, abrirPlanilla, ajustesCSV } from './ayudas.js';

// La planilla de prueba trae precios a propósito: simula que el comercio la publicó mal.
const filas = [
  ['G5', 'Guirnalda 5 m', 'Guirnaldas', 'Lista para enchufar', '$ 14.900', '$ 17.900', '', ''],
  ['G125', 'Lámpara vintage G125', 'Lámparas', 'Filamento ámbar', '8900', '', '', ''],
  ['REF', 'Reflector a pedido', 'Reflectores', 'Consultar medidas', '', '', '', ''],
];
const alta = { nombre: 'Nombre del alta', bajada: 'Bajada del alta', wa: '5491100000000', precios: true };
const tarjeta = (page, nombre) => page.locator('#grid .pc').filter({ has: page.locator('h3', { hasText: nombre }) });
const sumar = (page, nombre) => tarjeta(page, nombre).locator('button[data-a="+"]').tap();

async function enviar(page, externas) {
  await page.locator('#cartbar').tap();
  await page.locator('#sendOrder').tap();
  await expect.poll(() => externas.find(u => u.startsWith('https://wa.me/'))).toBeTruthy();
  return externas.find(u => u.startsWith('https://wa.me/'));
}

test('AC-011-1 con Precios = NO no hay ningún precio, porcentaje ni total en el HTML', async ({ page }) => {
  await abrirPlanilla(page, filas, alta, [['Precios', 'NO']]);
  await sumar(page, 'Guirnalda 5 m');
  await sumar(page, 'Lámpara vintage G125');
  await page.locator('#cartbar').tap();
  await expect(page.locator('#cartH')).toHaveText('Tu consulta');
  const html = await page.content();
  expect(html).not.toMatch(/\$\s?\d/);
  expect(html).not.toMatch(/-\d+%/);
  expect(html).not.toMatch(/14[.,]?900|17[.,]?900|8[.,]?900/);
  await expect(page.locator('#tot')).toBeHidden();
  await expect(page.locator('#cbTot')).toHaveText('');
  await expect(tarjeta(page, 'Guirnalda 5 m').locator('.prow')).toHaveText('Consultá el precio');
});

test('AC-011-2 con Precios = SÍ un producto sin precio muestra "Consultar"', async ({ page }) => {
  await abrirPlanilla(page, filas, { ...alta, precios: false }, [['Precios', 'SÍ']]);
  await expect(tarjeta(page, 'Reflector a pedido').locator('.prow')).toHaveText('Consultar');
  await expect(tarjeta(page, 'Guirnalda 5 m').locator('.pr')).toHaveText('$14.900');
});

test('AC-002-3 con precios ocultos el mensaje dice "Quiero consultar precio de" y no tiene importes', async ({ page, externas }) => {
  await abrirPlanilla(page, filas, alta, [['Precios', 'NO'], ['Nombre', 'Luz Norte']]);
  await sumar(page, 'Guirnalda 5 m');
  await sumar(page, 'Guirnalda 5 m');
  await sumar(page, 'Lámpara vintage G125');
  const texto = new URL(await enviar(page, externas)).searchParams.get('text');
  expect(texto).toBe('Hola Luz Norte! Quiero consultar precio de:\n• 2 × Guirnalda 5 m\n• 1 × Lámpara vintage G125');
  expect(texto).not.toMatch(/\$|Total/);
});

test('UC-011 escenario 4: al recargar con otro nombre y WhatsApp en Ajustes, se ven y el pedido va al número nuevo', async ({ page, externas }) => {
  const planilla = await abrirPlanilla(page, filas, alta, [['WhatsApp', '5491111111111'], ['Nombre', 'Luz Norte'], ['Bajada', 'Iluminación para tu casa']]);
  await expect(page.locator('#stName')).toHaveText('Luz Norte');
  await expect(page.locator('#stSub')).toHaveText('Iluminación para tu casa');

  planilla.ajustesCSV = ajustesCSV([['WhatsApp', '+54 9 11 2222-2222'], ['Nombre', 'Luz Sur']]);
  await page.reload();
  await expect(page.locator('#stName')).toHaveText('Luz Sur');
  await expect(page.locator('#stSub')).toHaveText('Bajada del alta');
  await sumar(page, 'Guirnalda 5 m');
  expect(await enviar(page, externas)).toMatch(/^https:\/\/wa\.me\/5491122222222\?text=/);
});

test('UC-011 escenario 4: con los ajustes vacíos se usan los valores del alta', async ({ page, externas }) => {
  await abrirPlanilla(page, filas, alta, [['WhatsApp', ''], ['Precios', ''], ['Nombre', ''], ['Bajada', '']]);
  await expect(page.locator('#stName')).toHaveText('Nombre del alta');
  await expect(page.locator('#stSub')).toHaveText('Bajada del alta');
  await expect(tarjeta(page, 'Lámpara vintage G125').locator('.pr')).toHaveText('$8.900');
  await sumar(page, 'Lámpara vintage G125');
  expect(await enviar(page, externas)).toMatch(/^https:\/\/wa\.me\/5491100000000\?text=/);
});

test('SPEC §5 si la pestaña Ajustes no responde, se usan los valores del alta', async ({ page }) => {
  const planilla = await abrirPlanilla(page, filas, { ...alta, precios: false }, [['Precios', 'SÍ'], ['Nombre', 'Luz Norte']]);
  await expect(page.locator('#stName')).toHaveText('Luz Norte');
  planilla.ajustesCaida = true;
  await page.reload();
  await expect(page.locator('#stName')).toHaveText('Nombre del alta');
  await expect(tarjeta(page, 'Guirnalda 5 m').locator('.prow')).toHaveText('Consultá el precio');
  expect(await page.content()).not.toMatch(/\$\s?\d/);
});
