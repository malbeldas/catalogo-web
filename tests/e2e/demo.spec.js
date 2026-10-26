// UC-020 — Demo para mostrar el producto desde el celular (SPEC.md §2, §4, §9).
import { test, expect, simularCatalogo } from './ayudas.js';

const productos = [
  { id: 'G5', n: 'Guirnalda 5 m', cat: 'Guirnaldas', p: 14900 },
  { id: 'G125', n: 'Lámpara vintage G125', cat: 'Lámparas', p: 8900 },
];

for (const [caso, url] of [['sin demo', '/tienda.html?t=pled'], ['con demo=0', '/tienda.html?t=pled&demo=0']]) {
  test(`AC-020-1 ${caso} no aparece la barra de demo y el pedido abre WhatsApp`, async ({ page, externas }) => {
    await simularCatalogo(page, { productos });
    await page.goto(url);
    await expect(page.locator('#grid .pc')).toHaveCount(2);
    await expect(page.locator('#demobar')).toBeHidden();
    await expect(page.locator('body')).not.toHaveClass(/has-demo/);
    await page.locator('#grid .pc').first().locator('button[data-a="+"]').tap();
    await page.locator('#cartbar').tap();
    await page.locator('#sendOrder').tap();
    await expect.poll(() => externas.some(u => u.startsWith('https://wa.me/5491100000000?text='))).toBe(true);
    await expect(page.locator('#shChat')).toBeHidden();
  });
}

test('AC-020-1 con demo=1 aparece la barra con los tres ejemplos y Funciones', async ({ page }) => {
  await simularCatalogo(page, { productos });
  await page.goto('/tienda.html?t=pled&demo=1');
  await expect(page.locator('#demobar')).toBeVisible();
  await expect(page.locator('#demoEx button')).toHaveText(['Mayorista', 'Minorista', 'Tu cliente']);
  await expect(page.locator('#demoFx')).toBeVisible();
});

test('AC-020-2 lo armado en "Tu cliente" con la clave anterior se conserva y pasa a la nueva', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('sembrado')) return;
    localStorage.setItem('mostrador_propia', JSON.stringify({ nombre: 'Kiosco Ana', productos: [{ id: 'p1', n: 'Alfajor triple', img: '', p: 500 }] }));
    sessionStorage.setItem('sembrado', '1');
  });
  await page.goto('/tienda.html?t=propia&demo=1');
  await expect(page.locator('#stName')).toHaveText('Kiosco Ana');
  await expect(page.locator('#grid .pc h3')).toHaveText(['Alfajor triple']);
  const claves = await page.evaluate(() => Object.keys(localStorage));
  expect(claves).toEqual(['catalogo_propia']);
});

test('AC-020-1 sin demo=1 no se descarga demo.js y la página no tiene nada de la demo', async ({ page }) => {
  const pedidos = [];
  page.on('request', r => pedidos.push(r.url()));
  await simularCatalogo(page, { productos });
  await page.goto('/tienda.html?t=pled');
  await expect(page.locator('#grid .pc')).toHaveCount(2);
  await page.waitForLoadState('networkidle');
  expect(pedidos.filter(u => u.includes('demo.js'))).toEqual([]);
  expect(await page.content()).not.toMatch(/demobar|shFx|shEdit|shChat|Tu cliente|Armá el catálogo/);
});

test('AC-002-5 "Ver un pedido de ejemplo" muestra el chat y no llama a WhatsApp', async ({ page, externas }) => {
  await simularCatalogo(page, { productos });
  await page.goto('/tienda.html?t=pled&demo=1');
  await page.locator('#demoFx').tap();
  await page.locator('#fxOrder', { hasText: 'Ver un pedido de ejemplo' }).tap();
  await expect(page.locator('#shCart')).toBeVisible();
  await page.locator('#sendOrder').tap();
  await expect(page.locator('#shChat')).toBeVisible();
  await expect(page.locator('#chName')).toHaveText('Comercio de prueba');
  await expect(page.locator('#bub')).toContainText('Guirnalda 5 m');
  expect(externas.filter(u => u.includes('wa.me') || u.includes('whatsapp'))).toEqual([]);
});

// Fotos del repo como si salieran de la cámara del celular.
const fotos = ['img/pled-g125.jpg', 'img/pled-liston.jpg', 'img/pled-guirnalda-5m.jpg'];
async function armarTuCliente(page) {
  await page.goto('/tienda.html?t=propia&demo=1');
  await expect(page.locator('#shEdit')).toBeVisible();
  await page.locator('#eName').fill('Kiosco Ana');
  await page.locator('#eSub').fill('Golosinas y bebidas');
  await page.locator('#eLogo').setInputFiles('img/pled-logo.jpg');
  for (const f of fotos) await page.locator('#eAdd').setInputFiles(f);
  const filas = page.locator('#eProds .ep');
  await expect(filas).toHaveCount(3);
  for (const [i, [n, p]] of [['Alfajor triple', '900'], ['Gaseosa 1,5 l', '2500'], ['Chicles', '']].entries()) {
    await filas.nth(i).locator('[data-f="n"]').fill(n);
    await filas.nth(i).locator('[data-f="p"]').fill(p);
  }
  await page.locator('#eDone').tap();
}

test('AC-020-2 en "Tu cliente" se carga logo, 3 fotos y precios y se ve el catálogo armado', async ({ page }) => {
  await armarTuCliente(page);
  await expect(page.locator('#shEdit')).toBeHidden();
  await expect(page.locator('#stName')).toHaveText('Kiosco Ana');
  await expect(page.locator('#stSub')).toHaveText('Golosinas y bebidas');
  await expect(page.locator('#stLogo img')).toHaveAttribute('src', /^data:image\/jpeg/);
  await expect(page.locator('#grid .pc h3')).toHaveText(['Alfajor triple', 'Gaseosa 1,5 l', 'Chicles']);
  await expect(page.locator('#grid .pc .ph img')).toHaveCount(3);
  await expect(page.locator('#grid .pc').nth(0).locator('.pr')).toHaveText('$900');
  await expect(page.locator('#grid .pc').nth(2).locator('.prow')).toHaveText('Consultar');
});

test('AC-020-2 lo armado queda en este celular al recargar y "Empezar de cero" lo borra', async ({ page }) => {
  await armarTuCliente(page);
  await page.reload();
  await expect(page.locator('#stName')).toHaveText('Kiosco Ana');
  await expect(page.locator('#grid .pc')).toHaveCount(3);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual(['catalogo_propia']);
  await page.locator('#demoFx').tap();
  await page.locator('#fxEdit').tap();
  await page.locator('#eReset').tap();
  await expect(page.locator('#eProds .ep')).toHaveCount(0);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  await page.reload();
  await expect(page.locator('#shEdit')).toBeVisible();
  await expect(page.locator('#eName')).toHaveValue('');
});

test('SPEC §5 con el celular sin espacio la demo avisa "No hay más lugar en este celular"', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('lleno', 'QuotaExceededError'); };
  });
  await page.goto('/tienda.html?t=propia&demo=1');
  await page.locator('#eAdd').setInputFiles(fotos[0]);
  await expect(page.locator('#toast')).toHaveText('No hay más lugar en este celular: quitá algún producto');
  await expect(page.locator('#eProds .ep')).toHaveCount(1);
});
