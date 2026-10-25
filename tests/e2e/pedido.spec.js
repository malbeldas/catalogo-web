// UC-002 — Pedido por WhatsApp (SPEC.md §2, §5).
import { test, expect, abrirCatalogo } from './ayudas.js';

const productos = [
  { id: 'g5', n: 'Guirnalda 5 m', cat: 'Guirnaldas', d: 'Lista para enchufar', p: 14900 },
  { id: 'g125', n: 'Lámpara vintage G125', cat: 'Lámparas', d: 'Filamento ámbar', p: 8900 },
  { id: 'ref', n: 'Reflector a pedido', cat: 'Reflectores', d: 'Consultar medidas' },
];

const sumar = (page, nombre, veces = 1) => test.step(`sumar ${veces} × ${nombre}`, async () => {
  for (let i = 0; i < veces; i++) await page.locator('#grid .pc', { hasText: nombre }).locator('button[data-a="+"]').tap();
});

// Toca enviar y devuelve el link de WhatsApp que se intentó abrir (la ayuda lo corta antes de salir).
async function enviar(page, externas) {
  await page.locator('#cartbar').tap();
  await page.locator('#sendOrder').tap();
  await expect.poll(() => externas.find(u => u.startsWith('https://wa.me/'))).toBeTruthy();
  return externas.find(u => u.startsWith('https://wa.me/'));
}
const textoDe = link => new URL(link).searchParams.get('text');

test('AC-002-1 enviar abre wa.me con el número del comercio y el mensaje armado', async ({ page, externas }) => {
  await abrirCatalogo(page, { nombre: 'PLED', wa: '+54 9 11 7603-3649', productos });
  await sumar(page, 'Guirnalda 5 m');
  const link = await enviar(page, externas);
  const esperado = 'Hola PLED! Quiero hacer este pedido:\n• 1 × Guirnalda 5 m ($14.900)\nTotal estimado: $14.900';
  expect(link).toBe('https://wa.me/5491176033649?text=' + encodeURIComponent(esperado));
});

test('AC-002-2 con 2 guirnaldas y 1 lámpara el mensaje tiene subtotales y total', async ({ page, externas }) => {
  await abrirCatalogo(page, { nombre: 'PLED', wa: '5491100000000', productos });
  await sumar(page, 'Guirnalda 5 m', 2);
  await sumar(page, 'Lámpara vintage G125');
  await sumar(page, 'Reflector a pedido');
  expect(textoDe(await enviar(page, externas))).toBe([
    'Hola PLED! Quiero hacer este pedido:',
    '• 2 × Guirnalda 5 m ($29.800)',
    '• 1 × Lámpara vintage G125 ($8.900)',
    '• 1 × Reflector a pedido',
    'Total estimado: $38.700',
  ].join('\n'));
});

test('AC-002-2 sumar y quitar actualiza la barra, las líneas y el total', async ({ page }) => {
  await abrirCatalogo(page, { wa: '5491100000000', productos });
  await sumar(page, 'Guirnalda 5 m', 2);
  await expect(page.locator('#cbN')).toHaveText('2');
  await expect(page.locator('#cbTot')).toHaveText('$29.800');
  await page.locator('#cartbar').tap();
  await expect(page.locator('#tot')).toContainText('$29.800');
  await page.locator('#lines li', { hasText: 'Guirnalda' }).locator('button[data-a="-"]').tap();
  await expect(page.locator('#tot')).toContainText('$14.900');
  await page.locator('#lines li', { hasText: 'Guirnalda' }).locator('button[data-a="-"]').tap();
  await expect(page.locator('#shCart')).toBeHidden();
  await expect(page.locator('#cartbar')).toBeHidden();
});

test('AC-002-4 con nombre el mensaje termina en "Soy Juan." y el nombre no queda en la web', async ({ page, externas }) => {
  await abrirCatalogo(page, { wa: '5491100000000', productos });
  await sumar(page, 'Lámpara vintage G125');
  await page.locator('#cartbar').tap();
  await page.fill('#cName', 'Juan');
  const urlWeb = page.url();
  await page.locator('#sendOrder').tap();
  await expect.poll(() => externas.find(u => u.startsWith('https://wa.me/'))).toBeTruthy();
  expect(textoDe(externas.find(u => u.startsWith('https://wa.me/')))).toMatch(/\nSoy Juan\.$/);
  // Regla hard 5: el nombre solo viaja en el mensaje.
  expect(urlWeb).not.toContain('Juan');
  expect(externas.filter(u => !u.startsWith('https://wa.me/')).join(' ')).not.toContain('Juan');
  await page.goBack().catch(() => {});
  await page.goto('/tienda.html?t=pled&demo=0');
  const guardado = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }) + document.cookie);
  expect(guardado).not.toContain('Juan');
});

test('SPEC §5 sin número de WhatsApp se avisa en lugar del botón y el pedido sigue andando', async ({ page, externas }) => {
  await abrirCatalogo(page, { wa: '', productos });
  await expect(page.locator('#stTags')).not.toContainText('WhatsApp');
  await sumar(page, 'Guirnalda 5 m');
  await page.locator('#cartbar').tap();
  await expect(page.locator('#sinWa')).toHaveText('Este comercio todavía no cargó su WhatsApp');
  await expect(page.locator('#sendOrder')).toBeHidden();
  await expect(page.locator('#cNameFld')).toBeHidden();
  await expect(page.locator('#tot')).toContainText('$14.900');
  expect(externas.some(u => u.includes('wa.me'))).toBe(false);
});
