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
