// UC-001 — Navegar y buscar (SPEC.md §2).
import { test, expect, abrirCatalogo, simularCatalogo, generarProductos, emularCelular4G } from './ayudas.js';

const ancho = page => page.evaluate(() => document.documentElement.scrollWidth);

// Sensores va primero a propósito: el orden de la planilla no es el alfabético.
const ejemplo = [
  { id: 's1', n: 'Listón con sensor', cat: 'Sensores', d: 'Se enciende al pasar la mano', p: 15900 },
  { id: 'g1', n: 'Guirnalda 5 m', cat: 'Guirnaldas', d: 'Lista para enchufar', p: 14900 },
  { id: 'l1', n: 'Lámpara vintage G125', cat: 'Lámparas', d: 'Filamento ámbar', p: 8900 },
  { id: 'g2', n: 'Guirnalda 10 m', cat: 'Guirnaldas', d: 'Diez lámparas gota', p: 24900 },
];

test.describe('AC-001-1 búsqueda', () => {
  test('AC-001-1 buscar "lampara" muestra "Lámpara vintage G125"', async ({ page }) => {
    await abrirCatalogo(page, { productos: ejemplo });
    await page.fill('#q', 'lampara');
    await expect(page.locator('#grid .pc h3')).toHaveText(['Lámpara vintage G125', 'Guirnalda 10 m']);
  });

  test('AC-001-1 la búsqueda encuentra palabras de la descripción', async ({ page }) => {
    await abrirCatalogo(page, { productos: ejemplo });
    await page.fill('#q', 'PASAR LA MANO');
    await expect(page.locator('#grid .pc h3')).toHaveText(['Listón con sensor']);
  });

  test('AC-001-1 sin resultados avisa y al borrar vuelven todos', async ({ page }) => {
    await abrirCatalogo(page, { productos: ejemplo });
    await page.fill('#q', 'heladera');
    await expect(page.locator('#grid .pc')).toHaveCount(0);
    await expect(page.locator('#empty')).toContainText('No encontramos productos');
    await page.fill('#q', '');
    await expect(page.locator('#grid .pc')).toHaveCount(4);
  });
});

test.describe('AC-001-2 categorías', () => {
  test('AC-001-2 las categorías aparecen en el orden de la planilla', async ({ page }) => {
    await abrirCatalogo(page, { productos: ejemplo });
    await expect(page.locator('#cats button')).toHaveText(['Todo', 'Sensores', 'Guirnaldas', 'Lámparas']);
  });

  test('AC-001-2 elegir una categoría filtra la grilla', async ({ page }) => {
    await abrirCatalogo(page, { productos: ejemplo });
    await page.locator('#cats button', { hasText: 'Guirnaldas' }).tap();
    await expect(page.locator('#grid .pc h3')).toHaveText(['Guirnalda 5 m', 'Guirnalda 10 m']);
    await expect(page.locator('#cats button.on')).toHaveText('Guirnaldas');
  });

  test('AC-001-2 con una sola categoría no se muestra la barra', async ({ page }) => {
    await abrirCatalogo(page, { productos: generarProductos(6, ['Guirnaldas']) });
    await expect(page.locator('#grid .pc')).toHaveCount(6);
    await expect(page.locator('#cats button')).toHaveCount(0);
  });
});

test.describe('AC-001-3 catálogo grande', () => {
  test('AC-001-3 con 3.000 productos la primera pantalla aparece en menos de 2 s', async ({ page }) => {
    await emularCelular4G(page);
    await abrirCatalogo(page, { productos: generarProductos(3000, ['Guirnaldas', 'Lámparas', 'Sensores']) });
    await expect(page.locator('#grid .pc').first()).toBeVisible();
    const ms = await page.evaluate(() => performance.now());
    test.info().annotations.push({ type: 'primera pantalla', description: `${Math.round(ms)} ms` });
    expect(ms).toBeLessThan(2000);
  });

  test('AC-001-3 al bajar se van cargando más productos', async ({ page }) => {
    await abrirCatalogo(page, { productos: generarProductos(3000, ['Guirnaldas', 'Lámparas', 'Sensores']) });
    await expect(page.locator('#grid .pc')).toHaveCount(60);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.locator('#grid .pc')).toHaveCount(120);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.locator('#grid .pc')).toHaveCount(180);
  });

  test('AC-001-3 la búsqueda encuentra productos que todavía no se dibujaron', async ({ page }) => {
    await abrirCatalogo(page, { productos: generarProductos(3000, ['Guirnaldas', 'Lámparas', 'Sensores']) });
    await page.fill('#q', 'Producto 2999');
    await expect(page.locator('#grid .pc h3')).toHaveText(['Producto 2999']);
  });
});

test.describe('AC-001-4 pantalla de celular', () => {
  test('AC-001-4 a 375 px no hay scroll horizontal en ninguna pantalla', async ({ page }) => {
    const largos = ejemplo.map(p => ({ ...p, n: p.n + ' con un nombre larguísimo para ver si rompe la grilla del celular', d: 'Descripción también muy larga '.repeat(6) }));
    await abrirCatalogo(page, { productos: [...largos, ...generarProductos(30, ['Iluminación de exterior y jardín', 'Accesorios', 'Tiras', 'Reflectores', 'Apliques'])] });
    expect(await ancho(page)).toBeLessThanOrEqual(375);

    await page.fill('#q', 'lampara');
    expect(await ancho(page)).toBeLessThanOrEqual(375);

    await page.fill('#q', '');
    await page.locator('#cats button').last().tap();
    expect(await ancho(page)).toBeLessThanOrEqual(375);

    await page.locator('#grid .pc button[data-a="+"]').first().tap();
    await page.locator('#cartbar').tap();
    await expect(page.locator('#shCart')).toBeVisible();
    expect(await ancho(page)).toBeLessThanOrEqual(375);
  });
});

test('UC-001 con cat=<categoría> en la URL el catálogo abre en esa categoría, sin importar mayúsculas ni acentos', async ({ page }) => {
  await simularCatalogo(page, { productos: ejemplo });
  await page.goto('/tienda.html?t=pled&cat=lamparas');
  await expect(page.locator('#cats button.on')).toHaveText('Lámparas');
  await expect(page.locator('#cats button.on')).toBeInViewport();
  await expect(page.locator('#grid .pc h3')).toHaveText(['Lámpara vintage G125']);
  await page.goto('/tienda.html?t=pled&cat=no-existe');
  await expect(page.locator('#cats button.on')).toHaveText('Todo');
  await expect(page.locator('#grid .pc')).toHaveCount(4);
});

test('UC-001 con q=<búsqueda> en la URL el catálogo abre con esa búsqueda hecha', async ({ page }) => {
  await simularCatalogo(page, { productos: ejemplo });
  await page.goto('/tienda.html?t=pled&q=guirnalda');
  await expect(page.locator('#q')).toHaveValue('guirnalda');
  await expect(page.locator('#grid .pc h3')).toHaveText(['Guirnalda 5 m', 'Guirnalda 10 m']);
});
