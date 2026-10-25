import { test, expect, abrirCatalogo, generarProductos } from './ayudas.js';

test('humo: abre la tienda con el catálogo simulado y muestra los productos', async ({ page }) => {
  await abrirCatalogo(page, { productos: generarProductos(5, ['Guirnaldas', 'Lámparas']) });
  await expect(page.locator('#grid .pc')).toHaveCount(5);
  await expect(page.locator('#grid .pc h3').first()).toHaveText('Producto 1');
});

test('humo: ninguna llamada sale de localhost', async ({ page, externas }) => {
  await abrirCatalogo(page, { productos: generarProductos(3) });
  await page.waitForLoadState('networkidle');
  // La tienda pide Google Fonts: se corta y queda anotado.
  expect(externas.some(u => u.includes('fonts.googleapis.com'))).toBe(true);
});
