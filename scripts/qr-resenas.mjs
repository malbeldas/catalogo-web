/* Tarjeta del QR de reseñas para imprimir (UC-023): logo, color y nombre del comercio, y un QR a su resena.html,
   que manda directo al formulario de reseña de Google. No ofrece nada a cambio de la reseña (AC-023-1).
   Genera tarjeta.png (para mandar por WhatsApp o imprimir sola) y tarjetas-A4.pdf (4 por hoja, con líneas de corte).
   El QR se arma acá, sin servicios externos (regla hard 1). Corre en la base: no se copia al cliente.
   Uso: node scripts/qr-resenas.mjs <carpeta del cliente> <URL de su catálogo> [carpeta de salida] */
import { readFile, mkdir } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc } from '../core/datos.js';
import { esLinkResena } from './alta.mjs';

// URL de resena.html a partir de la del catálogo: https://cuenta.github.io/catalogo → …/catalogo/resena.html
export function urlResena(sitio) {
  let u;
  try { u = new URL(String(sitio ?? '').trim()); } catch { return null; }
  if (u.protocol !== 'https:' || u.search || u.hash) return null;
  const ruta = u.pathname.replace(/\/(index\.html)?$/, '');
  return `${u.origin}${ruta}/resena.html`;
}

// Texto claro u oscuro sobre el color del comercio, con el mismo criterio que el catálogo.
const luminancia = h => {
  const n = parseInt(h.slice(1), 16);
  const c = [n >> 16, n >> 8 & 255, n & 255].map(v => (v /= 255) <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
};

// Una tarjeta de 105 × 148,5 mm (un cuarto de A4). qr es el SVG del código; logo, una URL o data: de la imagen.
export function tarjetaHTML({ nombre = '', color = '#1f2937', logo = '', qr = '' }) {
  const marca = /^#[0-9a-f]{6}$/i.test(color) ? color : '#1f2937';
  const sobreMarca = luminancia(marca) > .45 ? '#111' : '#fff';
  return `<div class="tarjeta" style="--marca:${marca};--sobre-marca:${sobreMarca}">
  ${logo ? `<img class="logo" src="${esc(logo)}" alt="">` : ''}
  <p class="nombre">${esc(nombre)}</p>
  <h1>¿Te gustó tu compra?</h1>
  <p class="pedido">Dejanos tu reseña en Google</p>
  <div class="qr">${qr}</div>
  <p class="ayuda">Escaneá el código con la cámara del celular</p>
  <div class="pie"></div>
</div>`;
}

const ESTILOS = `*{box-sizing:border-box;margin:0}
body{font-family:Inter,system-ui,sans-serif;color:#15181d;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.tarjeta{position:relative;width:105mm;height:148.5mm;padding:11mm 10mm 0;display:flex;flex-direction:column;align-items:center;text-align:center;background:#fff;overflow:hidden}
.logo{max-width:52mm;max-height:20mm;object-fit:contain}
.nombre{margin-top:3mm;font-size:9.5pt;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#5b636e}
h1{margin-top:7mm;font:800 19pt/1.1 Inter,system-ui,sans-serif;letter-spacing:-.02em}
.pedido{margin-top:2mm;font-size:12.5pt;font-weight:600;color:var(--marca)}
.qr{margin-top:7mm;width:52mm;height:52mm;padding:3.5mm;border:1.2mm solid var(--marca);border-radius:4mm;background:#fff}
.qr svg{display:block;width:100%;height:100%}
.ayuda{margin-top:5mm;font-size:9.5pt;color:#5b636e}
.pie{position:absolute;left:0;right:0;bottom:0;height:5mm;background:var(--marca)}
.hoja{display:grid;grid-template-columns:105mm 105mm;grid-template-rows:148.5mm 148.5mm;width:210mm;height:297mm}
.hoja .tarjeta{outline:.2mm dashed #c4c9d0;outline-offset:-.1mm}
@page{size:A4;margin:0}`;

export const paginaTarjeta = tarjeta => `<!doctype html><html lang="es-AR"><head><meta charset="utf-8"><style>${ESTILOS}</style></head><body>${tarjeta}</body></html>`;
export const paginaHoja = tarjeta => paginaTarjeta(`<div class="hoja">${tarjeta.repeat(4)}</div>`);

const TIPOS = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

// Arma la tarjeta del comercio de esa carpeta y guarda tarjeta.png y tarjetas-A4.pdf en salida.
export async function generarTarjetas(carpeta, sitio, salida) {
  const tienda = JSON.parse(await readFile(join(carpeta, 'tienda.json'), 'utf8'));
  if (!esLinkResena(tienda.resenas)) throw new Error('tienda.json no tiene resenas: el link de "Pedir reseñas" del Perfil de Empresa de Google');
  const url = urlResena(sitio);
  if (!url) throw new Error(`"${sitio}" no es la URL https del catálogo, por ejemplo https://cuenta.github.io/catalogo/`);
  // qrcode y Playwright se cargan recién acá: el resto del script (y sus tests unitarios) no los necesita.
  const { default: QRCode } = await import('qrcode');
  const qr = await QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' });
  let logo = '';
  if (tienda.logo) {
    const tipo = TIPOS[extname(tienda.logo).toLowerCase()];
    if (tipo) logo = `data:${tipo};base64,${(await readFile(join(carpeta, tienda.logo))).toString('base64')}`;
  }
  const tarjeta = tarjetaHTML({ nombre: tienda.nombre, color: tienda.color, logo, qr });
  await mkdir(salida, { recursive: true });
  const { chromium } = await import('@playwright/test');
  const navegador = await chromium.launch();
  try {
    const png = await navegador.newPage({ viewport: { width: 397, height: 562 }, deviceScaleFactor: 3 });
    await png.setContent(paginaTarjeta(tarjeta), { waitUntil: 'load' });
    await png.locator('.tarjeta').screenshot({ path: join(salida, 'tarjeta.png') });
    const pdf = await navegador.newPage();
    await pdf.setContent(paginaHoja(tarjeta), { waitUntil: 'load' });
    await pdf.pdf({ path: join(salida, 'tarjetas-A4.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
  } finally {
    await navegador.close();
  }
  return { url, png: join(salida, 'tarjeta.png'), pdf: join(salida, 'tarjetas-A4.pdf') };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [carpeta, sitio, salida] = process.argv.slice(2);
  if (!carpeta || !sitio) { console.error('Uso: node scripts/qr-resenas.mjs <carpeta del cliente> <URL de su catálogo> [carpeta de salida]'); process.exit(2); }
  try {
    const r = await generarTarjetas(carpeta, sitio, resolve(salida || 'qr-resenas'));
    console.log(`QR a ${r.url}\nListo: ${r.png} y ${r.pdf}`);
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
