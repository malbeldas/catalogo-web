// UC-024 — Portada de venta: qué incluye, precio y consulta por WhatsApp (SPEC.md §2).
import { readFileSync } from 'node:fs';
import { test, expect } from './ayudas.js';
import { money, mensajePedido } from '../../core/datos.js';

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

test('AC-024-3 la portada no nombra a PLED fuera de los ejemplos, a Pueyrredón solo en el caso real, y no usa "Mostrador"', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#precio')).toBeVisible();
  // Fuera de los links a los ejemplos: texto visible, título y descripción, y lo que dice el mensaje de ventas.
  const textos = await page.evaluate(() => {
    const copia = document.querySelector('main').cloneNode(true);
    copia.querySelectorAll('.go').forEach(e => e.remove());
    const sinCaso = copia.cloneNode(true);
    sinCaso.querySelector('#caso').remove();
    return { conCaso: copia.innerText, sinCaso: sinCaso.innerText, otros: [document.title, document.querySelector('meta[name=description]').content, decodeURIComponent(document.querySelector('#consultar').href)] };
  });
  for (const t of [textos.conCaso, ...textos.otros]) expect(t).not.toMatch(/\bpled\b|mostrador/i);
  for (const t of [textos.sinCaso, ...textos.otros]) expect(t).not.toMatch(/pueyrred[oó]n/i);
  expect(JSON.stringify(portada)).not.toMatch(/pueyrred[oó]n|\bpled\b|mostrador/i);
  expect(await page.content()).not.toMatch(/mostrador/i);
});

test('AC-024-6 la portada muestra el caso real de Pueyrredón con su captura, sus datos y el link a su catálogo', async ({ page }) => {
  await page.goto('/');
  const caso = page.locator('#caso');
  await caso.scrollIntoViewIfNeeded();
  await expect(caso.locator('h2')).toContainText('Distribuidora Pueyrredón');
  const foto = caso.locator('img[src="img/portada/pueyrredon.jpg"]');
  await expect.poll(() => foto.evaluate(i => i.complete && i.naturalWidth)).toBe(750);
  // Los datos se comprueban en su catálogo: 2.637 productos en catalogo-respaldo.json y precios ocultos en tienda.json.
  await expect(caso.locator('.datos li')).toHaveText(['2.637 productos', 'Precios a consultar', 'Se actualiza desde su Excel']);
  const link = caso.locator('a[href="https://distribuidora-pueyrredon.github.io/catalogo/"]');
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('target', '_blank');
  // Sin cifras de ventas ni testimonios: no hay porcentajes ni citas.
  const texto = await caso.innerText();
  expect(texto).not.toMatch(/%|["“”]/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test('AC-024-2 todos los botones de WhatsApp van al número de ventas, y en el celular queda uno fijo al bajar', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#precio')).toBeVisible();
  const links = await page.locator('a.js-wa, #consultar').evaluateAll(as => as.map(a => a.href));
  expect(links.length).toBeGreaterThanOrEqual(4);
  for (const l of links) expect(l).toBe(WA);
  const fijo = page.locator('#waFijo');
  // Arriba se ve el botón del principio, así que el fijo no aparece.
  await expect(fijo).toHaveClass(/fuera/);
  await page.locator('#como').scrollIntoViewIfNeeded();
  await expect(fijo).not.toHaveClass(/fuera/);
  await expect(fijo).toBeInViewport({ ratio: 1 });
  // Cuando se ve el botón del cierre, el fijo se esconde para no taparlo.
  await page.locator('.cierre .js-wa').scrollIntoViewIfNeeded();
  await expect(fijo).toHaveClass(/fuera/);
});

test('AC-024-4 la portada muestra capturas reales, cómo funciona en 3 pasos y preguntas frecuentes', async ({ page }) => {
  await page.goto('/');
  // Todas las capturas existen y cargan (no hay fotos rotas).
  const fotos = page.locator('main img[src^="img/portada/"]');
  expect(await fotos.count()).toBeGreaterThanOrEqual(5);
  for (const f of await fotos.all()) {
    await f.scrollIntoViewIfNeeded();
    await expect.poll(() => f.evaluate(i => i.complete && i.naturalWidth)).toBe(750);
  }
  await expect(page.locator('.pasos li')).toHaveCount(3);
  // El mensaje de ejemplo es el que arma el catálogo.
  const ejemplo = [{ p: { n: 'Almendras peladas 250 g', p: 5900 }, q: 1 }, { p: { n: 'Mix de frutos secos 250 g', p: 4800 }, q: 2 }];
  await expect(page.locator('#mensaje')).toHaveText(mensajePedido(ejemplo, { comercio: 'La Alacena Natural', precios: true }));
  const preguntas = page.locator('.faq details');
  expect(await preguntas.count()).toBeGreaterThanOrEqual(5);
  const primera = preguntas.first();
  await expect(primera.locator('p')).toBeHidden();
  await primera.locator('summary').tap();
  await expect(primera.locator('p')).toBeVisible();
  // Mobile first (regla hard 6): con todo abierto, nada se sale de los 375 px.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test('AC-024-5 al compartir el link se ve título, descripción e imagen de 1200 × 630', async ({ page }) => {
  await page.goto('/');
  const meta = n => page.locator(`meta[property="${n}"]`).getAttribute('content');
  expect(await meta('og:title')).toBeTruthy();
  expect((await meta('og:description')).length).toBeGreaterThan(40);
  const imagen = await meta('og:image');
  // WhatsApp necesita la URL completa de la imagen, en https.
  expect(imagen).toBe('https://malbeldas.github.io/catalogo-web/img/portada/compartir.jpg');
  expect(await meta('og:image:width')).toBe('1200');
  expect(await meta('og:image:height')).toBe('630');
  const tam = await page.evaluate(() => new Promise(ok => { const i = new Image(); i.onload = () => ok([i.naturalWidth, i.naturalHeight]); i.onerror = () => ok(null); i.src = 'img/portada/compartir.jpg'; }));
  expect(tam).toEqual([1200, 630]);
});

test('humo: la portada no lleva noindex, así Google la puede mostrar', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('meta[name=robots]')).toHaveCount(0);
});
