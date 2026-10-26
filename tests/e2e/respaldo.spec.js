// UC-010 — Respaldo del catálogo cuando la planilla falla (SPEC.md §3, §5; escenarios de STORY-003, #5).
import { test, expect, abrirPlanilla, servirRespaldo } from './ayudas.js';

const filas = [
  ['G5', 'Guirnalda 5 m', 'Guirnaldas', 'Lista para enchufar', '$ 14.900', '', '', ''],
  ['G125', 'Lámpara vintage G125', 'Lámparas', 'Filamento ámbar', '8900', '', '', ''],
];
// La última copia buena tiene otros productos, para distinguir de dónde salió lo que se ve.
const copia = {
  productos: [
    { id: 'T5', n: 'Tira LED 5 m', cat: 'Tiras LED', d: 'Copia de respaldo', p: 12500, antes: 15000, img: '' },
    { id: 'R30', n: 'Reflector 30 W', cat: 'Reflectores', d: '', p: null, antes: null, img: '' },
  ],
  ajustes: { nombre: 'Nombre del respaldo', wa: '5491176033649', precios: true },
};
const alta = { nombre: 'Nombre del alta', bajada: 'Bajada del alta', wa: '5491100000000', precios: true };
const nombres = page => page.locator('#grid .pc h3');
const sinAvisos = /error|no respond|actualizando|despublic/i;

test('AC-010-4 con la planilla caída se ven los productos del respaldo y ningún texto de error', async ({ page }) => {
  await servirRespaldo(page, copia);
  const planilla = await abrirPlanilla(page, filas, alta, [['Precios', 'SÍ']]);
  planilla.webCaida = planilla.ajustesCaida = true;
  await page.reload();
  await expect(nombres(page)).toHaveText(['Tira LED 5 m', 'Reflector 30 W']);
  await expect(page.locator('#stName')).toHaveText('Nombre del respaldo');
  await expect(page.locator('#q')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(sinAvisos);
});

test('AC-010-4 con la planilla despublicada (Google responde una página) se usa el respaldo', async ({ page }) => {
  await servirRespaldo(page, copia);
  const planilla = await abrirPlanilla(page, filas, alta);
  planilla.csv = '<!DOCTYPE html><html><body>Iniciá sesión para ver esta hoja</body></html>';
  await page.reload();
  await expect(nombres(page)).toHaveText(['Tira LED 5 m', 'Reflector 30 W']);
  await expect(page.locator('body')).not.toContainText(/Iniciá sesión|DOCTYPE/);
  await expect(page.locator('body')).not.toContainText(sinAvisos);
});

test('AC-010-4 si solo falla Ajustes, los productos salen de la planilla y los ajustes del respaldo', async ({ page }) => {
  await servirRespaldo(page, copia);
  const planilla = await abrirPlanilla(page, filas, alta, [['Nombre', 'Nombre de la planilla']]);
  await expect(page.locator('#stName')).toHaveText('Nombre de la planilla');
  planilla.ajustesCaida = true;
  await page.reload();
  await expect(nombres(page)).toHaveText(['Guirnalda 5 m', 'Lámpara vintage G125']);
  await expect(page.locator('#stName')).toHaveText('Nombre del respaldo');
});

test('UC-010 escenario 2 sin planilla ni respaldo se ve "Estamos actualizando el catálogo" y WhatsApp al número del alta', async ({ page }) => {
  await servirRespaldo(page, null);
  const planilla = await abrirPlanilla(page, filas, alta);
  planilla.webCaida = true;
  await page.reload();
  await expect(page.locator('#empty')).toContainText('Estamos actualizando el catálogo');
  await expect(page.locator('#waDirecto')).toHaveAttribute('href', 'https://wa.me/5491100000000?text=Hola%2C%20quiero%20hacer%20una%20consulta.');
  await expect(page.locator('#q')).toBeHidden();
  await expect(page.locator('#grid .pc')).toHaveCount(0);
  await expect(page.locator('#cartbar')).toBeHidden();
});

test('AC-011-1 con precios ocultos los datos del respaldo no muestran importes', async ({ page }) => {
  await servirRespaldo(page, { ...copia, ajustes: { ...copia.ajustes, precios: false } });
  const planilla = await abrirPlanilla(page, filas, alta, [['Precios', 'NO']]);
  planilla.webCaida = planilla.ajustesCaida = true;
  await page.reload();
  await expect(nombres(page)).toHaveText(['Tira LED 5 m', 'Reflector 30 W']);
  await page.locator('#grid .pc').first().locator('button[data-a="+"]').tap();
  await page.locator('#cartbar').tap();
  const html = await page.content();
  expect(html).not.toMatch(/\$\s?\d/);
  expect(html).not.toMatch(/12[.,]?500|15[.,]?000|-\d+%/);
});

test('SPEC §4 con la planilla andando no se pide el respaldo', async ({ page }) => {
  const respaldo = await servirRespaldo(page, copia);
  await abrirPlanilla(page, filas, alta, [['Precios', 'SÍ']]);
  await expect(nombres(page)).toHaveText(['Guirnalda 5 m', 'Lámpara vintage G125']);
  expect(respaldo.pedidos).toBe(0);
});
