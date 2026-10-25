// UC-010 — Productos desde la planilla (SPEC.md §2, §3, §5).
import { test, expect, abrirPlanilla, aCSV } from './ayudas.js';

const tarjetas = page => page.locator('#grid .pc');
const nombres = page => tarjetas(page).locator('h3');
const tarjeta = (page, nombre) => tarjetas(page).filter({ has: page.locator('h3', { hasText: nombre }) });

const guirnalda = ['G5', 'Guirnalda 5 m', 'Guirnaldas', 'Lista para enchufar', '$ 14.900', '', '/img/pled-guirnalda-5m.jpg', 'SÍ'];
const lampara = ['G125', 'Lámpara vintage G125', 'Lámparas', 'Filamento ámbar', '8900', '', '/img/pled-g125.jpg', ''];

test('AC-010-1 un producto agregado a la planilla aparece al recargar', async ({ page }) => {
  const planilla = await abrirPlanilla(page, [guirnalda]);
  await expect(nombres(page)).toHaveText(['Guirnalda 5 m']);

  planilla.csv = aCSV([guirnalda, lampara]);
  await page.reload();
  await expect(nombres(page)).toHaveText(['Guirnalda 5 m', 'Lámpara vintage G125']);
  expect(planilla.lecturas).toBe(2);
});

test('AC-010-2 un producto con Visible = NO no aparece', async ({ page }) => {
  await abrirPlanilla(page, [guirnalda, ['OC', 'Producto oculto', 'Lámparas', '', '1000', '', '', 'NO'], lampara]);
  await expect(nombres(page)).toHaveText(['Guirnalda 5 m', 'Lámpara vintage G125']);
  await expect(page.locator('body')).not.toContainText('Producto oculto');
});

test('AC-010-3 una fila sin nombre se ignora sin romper el resto del catálogo', async ({ page }) => {
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  await abrirPlanilla(page, [guirnalda, ['X1', '', 'Sin nombre', 'Fila incompleta', '500', '', '', ''], ['', '', '', '', '', '', '', ''], lampara]);
  await expect(nombres(page)).toHaveText(['Guirnalda 5 m', 'Lámpara vintage G125']);
  await expect(page.locator('#cats button')).toHaveText(['Todo', 'Guirnaldas', 'Lámparas']);
  expect(errores).toEqual([]);
});

test('SPEC §5 una foto rota o un link de Drive privado muestran un recuadro con la inicial', async ({ page }) => {
  await abrirPlanilla(page, [
    guirnalda,
    ['COL', 'Colgante vintage', 'Colgantes', 'Drive privado', '13900', '', 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view?usp=sharing', ''],
    ['LIS', 'listón con sensor', 'Sensor', 'Foto rota', '15900', '', '/img/no-existe.jpg', ''],
    ['TIR', 'Tira LED 5 m', 'Tiras', 'Sin foto', '9900', '', '', ''],
  ]);
  await expect(tarjeta(page, 'Guirnalda 5 m').locator('.ph img')).toBeVisible();
  for (const [nombre, inicial] of [['Colgante vintage', 'C'], ['listón con sensor', 'L'], ['Tira LED 5 m', 'T']]) {
    const ph = tarjeta(page, nombre).locator('.ph');
    await expect(ph.locator('img')).toHaveCount(0);
    await expect(ph.locator('.ini')).toBeVisible();
    await expect(ph.locator('.ini')).toHaveText(inicial);
  }
});

test('SPEC §5 la foto rota del carrito deja el recuadro vacío', async ({ page }) => {
  await abrirPlanilla(page, [['LIS', 'Listón con sensor', 'Sensor', '', '15900', '', '/img/no-existe.jpg', '']]);
  await tarjeta(page, 'Listón con sensor').locator('button[data-a="+"]').tap();
  await page.locator('#cartbar').tap();
  await expect(page.locator('#lines li .ph0')).toBeVisible();
  await expect(page.locator('#lines li img')).toHaveCount(0);
});

test('SPEC §3 el precio anterior se ve tachado y con el porcentaje de descuento', async ({ page }) => {
  await abrirPlanilla(page, [['G5', 'Guirnalda 5 m', 'Guirnaldas', '', '$ 15.000', '$ 20.000', '', '']]);
  const t = tarjeta(page, 'Guirnalda 5 m');
  await expect(t.locator('.pr')).toHaveText('$15.000');
  await expect(t.locator('s')).toHaveText('$20.000');
  await expect(t.locator('.ph em')).toHaveText('-25%');
});

test('SPEC §5 un precio no numérico se muestra como "Consultar"', async ({ page }) => {
  await abrirPlanilla(page, [['R1', 'Reflector a pedido', 'Reflectores', '', 'a consultar', '', '', '']]);
  await expect(tarjeta(page, 'Reflector a pedido').locator('.prow')).toHaveText('Consultar');
});
