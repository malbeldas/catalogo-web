// AC-023-2 — Tarjeta del QR de reseñas: se genera el PNG y el PDF A4, y el contenido entra en la tarjeta.
import { mkdtemp, writeFile, readFile, copyFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import QRCode from 'qrcode';
import { test, expect } from './ayudas.js';
import { generarTarjetas, tarjetaHTML, paginaTarjeta } from '../../scripts/qr-resenas.mjs';

test('AC-023-2 se genera la tarjeta en PNG y una hoja A4 con 4 tarjetas en PDF', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tarjeta-'));
  await mkdir(join(dir, 'img'));
  await copyFile(new URL('../../img/ficticias/diet-almendras.jpg', import.meta.url), join(dir, 'img', 'logo.jpg'));
  await writeFile(join(dir, 'tienda.json'), JSON.stringify({ nombre: 'Kiosco Ana', color: '#7c3aed', logo: 'img/logo.jpg', resenas: 'https://g.page/r/CaAbC123xyz/review' }));
  const r = await generarTarjetas(dir, 'https://kiosco-ana.github.io/catalogo/', join(dir, 'out'));
  expect(r.url).toBe('https://kiosco-ana.github.io/catalogo/resena.html');
  const png = await readFile(r.png);
  expect(png.subarray(1, 4).toString()).toBe('PNG');
  // 105 × 148,5 mm a 96 dpi, por 3 (el alto se redondea a píxeles enteros).
  expect(png.readUInt32BE(16)).toBe(1191);
  expect(Math.abs(png.readUInt32BE(20) - 1684)).toBeLessThanOrEqual(3);
  const pdf = (await readFile(r.pdf)).toString('latin1');
  expect(pdf.startsWith('%PDF')).toBe(true);
  expect(pdf.match(/\/Type\s*\/Page[^s]/g)).toHaveLength(1);
});

test('AC-023-2 con un nombre largo todo entra en la tarjeta, sin pisar la franja de color', async ({ page }) => {
  const qr = await QRCode.toString('https://kiosco-ana.github.io/catalogo/resena.html', { type: 'svg', margin: 0 });
  await page.setViewportSize({ width: 397, height: 562 });
  await page.setContent(paginaTarjeta(tarjetaHTML({ nombre: 'Distribuidora de Iluminación y Material Eléctrico del Sur', color: '#06518b', qr })));
  const caja = s => page.locator(s).boundingBox();
  const [ayuda, pie, tarjeta] = await Promise.all(['.ayuda', '.pie', '.tarjeta'].map(caja));
  expect(ayuda.y + ayuda.height).toBeLessThanOrEqual(pie.y);
  expect(pie.y + pie.height).toBeLessThanOrEqual(tarjeta.y + tarjeta.height + 1);
});
