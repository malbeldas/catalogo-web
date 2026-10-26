// GA4 opcional por cliente (SPEC.md §3, regla hard 6). Nunca recibe el nombre del comprador (regla hard 5).
import { test, expect, simularCatalogo } from './ayudas.js';

const productos = [{ id: 'a1', n: 'Alfajor triple', p: 900 }];
const deGA = externas => externas.filter(u => /googletagmanager\.com|google-analytics\.com/.test(u));

test('SPEC §3 con ga4 en tienda.json se carga GA4 con ese ID y el pedido no le manda el nombre', async ({ page, externas }) => {
  await simularCatalogo(page, { productos, ga4: 'G-PRUEBA123' });
  await page.goto('/tienda.html?t=pled');
  await expect.poll(() => deGA(externas)).toEqual(['https://www.googletagmanager.com/gtag/js?id=G-PRUEBA123']);
  // Lo que se le pasa a GA4 se copia al test antes de que el pedido navegue a WhatsApp.
  const capa = [];
  await page.exposeFunction('copiarCapa', a => capa.push(a));
  await page.evaluate(() => { const push = dataLayer.push.bind(dataLayer); dataLayer.push = a => { copiarCapa(JSON.stringify(Array.from(a))); return push(a); }; });
  await page.locator('#grid .pc button[data-a="+"]').tap();
  await page.locator('#cartbar').tap();
  await page.locator('#cName').fill('Ana Gómez');
  await page.locator('#sendOrder').tap();
  await expect.poll(() => externas.some(u => u.startsWith('https://wa.me/'))).toBe(true);
  await expect.poll(() => capa.join()).toContain('enviar_pedido');
  expect(capa.join()).not.toMatch(/Ana|Alfajor/);
});

test('SPEC §3 sin ga4, con un ID inválido o en la demo no se carga GA4', async ({ page, externas }) => {
  for (const [tienda, url] of [[{}, '/tienda.html?t=pled'], [{ ga4: 'UA-123' }, '/tienda.html?t=pled'], [{ ga4: 'G-PRUEBA123' }, '/tienda.html?t=pled&demo=1']]) {
    await page.unrouteAll();
    await page.route(u => !['localhost', '127.0.0.1'].includes(u.hostname), r => { externas.push(r.request().url()); return r.abort('blockedbyclient'); });
    await simularCatalogo(page, { productos, ...tienda });
    await page.goto(url);
    await expect(page.locator('#grid .pc')).toHaveCount(1);
  }
  await page.waitForTimeout(300);
  expect(deGA(externas)).toEqual([]);
});
