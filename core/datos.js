/* Lógica pura del catálogo: sin document, window ni localStorage (SPEC.md §6, regla hard 3).
   Todo lo de acá tiene test unitario en tests/unit/ (datos, pedido y planilla). */

// Minúsculas y sin acentos, para comparar textos como los escribe la gente ("lampara" = "Lámpara").
export const sinAcentos = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');

// Escapa un texto de la planilla antes de meterlo en el HTML.
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const money = n => '$' + Math.round(n).toLocaleString('es-AR');

// Categorías en el orden en que aparecen en la planilla (AC-001-2), sin repetir ni vacías.
export function categorias(productos) {
  const out = [];
  for (const p of productos) if (p.cat && !out.includes(p.cat)) out.push(p.cat);
  return out;
}

// La barra de categorías solo tiene sentido con dos o más (AC-001-2).
export const mostrarBarraCategorias = cats => cats.length > 1;

// Texto de búsqueda de cada producto, calculado una sola vez: con miles de productos
// normalizar en cada tecla se nota en un celular.
const textos = new WeakMap();
function textoDe(p) {
  const clave = p.n + '\n' + (p.d || '');
  let t = textos.get(p);
  if (!t || t.clave !== clave) textos.set(p, t = { clave, q: sinAcentos(p.n + ' ' + (p.d || '')) });
  return t.q;
}

// Filtra por categoría (null = todas) y por texto en nombre y descripción (AC-001-1).
export function buscar(productos, texto, cat = null) {
  const q = sinAcentos(texto).trim();
  return productos.filter(p => (!cat || p.cat === cat) && (!q || textoDe(p).includes(q)));
}

// Productos por tanda: la grilla muestra de a LOTE y suma más al bajar (AC-001-3).
export const LOTE = 60;
export const lote = (lista, mostrados, tam = LOTE) => lista.slice(mostrados, mostrados + tam);

/* ---------- Pedido (UC-002) ---------- */

// Un producto suma al total solo si tiene un precio cargado.
const tienePrecio = p => Number.isFinite(p.p) && p.p > 0;

// items: [{ p: producto, q: cantidad }]. Con precios ocultos el total es 0 (regla hard 4).
export const totalPedido = (items, precios) =>
  precios ? items.reduce((s, { p, q }) => s + (tienePrecio(p) ? p.p * q : 0), 0) : 0;

// Mensaje listo para WhatsApp (AC-002-2, AC-002-3, AC-002-4). El nombre del comprador solo vive acá (regla hard 5).
export function mensajePedido(items, { comercio = '', precios = false, comprador = '' } = {}) {
  const total = totalPedido(items, precios), quien = String(comprador).trim();
  return [
    `Hola${comercio ? ' ' + comercio : ''}! ${precios ? 'Quiero hacer este pedido' : 'Quiero consultar precio de'}:`,
    ...items.map(({ p, q }) => `• ${q} × ${p.n}${precios && tienePrecio(p) ? ` (${money(p.p * q)})` : ''}`),
    total ? `Total estimado: ${money(total)}` : '',
    quien ? `Soy ${quien}.` : '',
  ].filter(Boolean).join('\n');
}

// Solo los dígitos del número: la planilla puede traer "+54 9 11 7603-3649".
export const numeroWhatsApp = n => String(n ?? '').replace(/\D/g, '');

// Link que abre WhatsApp con el mensaje escrito (AC-002-1); null si el comercio no cargó su número.
export function linkWhatsApp(numero, mensaje) {
  const n = numeroWhatsApp(numero);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(mensaje)}` : null;
}

/* ---------- Planilla del comercio (UC-010) ---------- */

// CSV de una pestaña publicada de Google Sheets: celdas entre comillas, comas y saltos de línea
// dentro de una celda, comillas dobladas (""). Devuelve las filas como listas de textos.
export function leerCSV(texto) {
  const filas = [], s = String(texto ?? '').replace(/^﻿/, '');
  let fila = [], celda = '', comillas = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (comillas) {
      if (c !== '"') celda += c;
      else if (s[i + 1] === '"') { celda += '"'; i++; }
      else comillas = false;
    } else if (c === '"') comillas = true;
    else if (c === ',') { fila.push(celda); celda = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      fila.push(celda); filas.push(fila); fila = []; celda = '';
    } else celda += c;
  }
  if (celda || fila.length) { fila.push(celda); filas.push(fila); }
  return filas;
}

// Precio como lo escribe la gente: "$ 14.900", "14900", "$14.900,00" o "14,900.00". Lo que no es un número da null ("Consultar", SPEC.md §5).
export function leerPrecio(valor) {
  let s = String(valor ?? '').trim();
  if (s.startsWith('-')) return null;
  s = s.replace(/[^\d.,]/g, '');
  if (!/\d/.test(s)) return null;
  const ult = Math.max(s.lastIndexOf('.'), s.lastIndexOf(','));
  if (ult >= 0) {
    const sep = s[ult], decimales = s.length - ult - 1;
    // Un solo tipo de separador, que aparece una vez y con 3 cifras detrás, es de miles ("14.900").
    const esMiles = !s.includes(sep === '.' ? ',' : '.') && (s.split(sep).length > 2 || decimales === 3);
    s = esMiles ? s.replace(/[.,]/g, '') : s.slice(0, ult).replace(/[.,]/g, '') + '.' + s.slice(ult + 1);
  }
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Foto desde un link compartido de Google Drive ("cualquiera con el link") o una URL de imagen.
// La miniatura de Drive no es un enlace oficial (SPEC.md §9): si Google lo cambia, se ajusta acá.
export function linkFoto(valor) {
  const s = String(valor ?? '').trim();
  if (!s) return '';
  if (/^https?:\/\/(drive|docs)\.google\.com\//i.test(s)) {
    const id = (s.match(/\/d\/([-\w]{10,})/) || s.match(/[?&]id=([-\w]{10,})/) || [])[1];
    return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w800` : '';
  }
  if (/^https?:\/\//i.test(s)) return s;
  // Sin esquema es una ruta del propio sitio (img/ del cliente); cualquier otro esquema (javascript:, data:) se descarta.
  return /^[a-z][a-z\d+.-]*:/i.test(s) || s.startsWith('//') ? '' : s;
}

// Columnas de la pestaña Web (SPEC.md §3), reconocidas sin importar mayúsculas, acentos ni espacios de más.
const COLUMNAS = { codigo: 'id', nombre: 'n', categoria: 'cat', descripcion: 'd', precio: 'p', 'precio anterior': 'antes', foto: 'img', visible: 'visible' };

// Filas del CSV (la primera son los títulos) a productos del catálogo.
// Se ignoran las filas sin nombre (AC-010-3) y las de Visible = NO (AC-010-2); de un código repetido gana la primera fila (SPEC.md §5).
export function productosDesdeFilas(filas) {
  const [titulos = [], ...resto] = filas, col = {};
  titulos.forEach((t, i) => { const k = COLUMNAS[sinAcentos(t).trim().replace(/\s+/g, ' ')]; if (k && !(k in col)) col[k] = i; });
  const celda = (fila, k) => k in col ? String(fila[col[k]] ?? '').trim() : '';
  const productos = [], vistos = new Set();
  resto.forEach((fila, i) => {
    const n = celda(fila, 'n');
    if (!n || sinAcentos(celda(fila, 'visible')) === 'no') return;
    // Sin código, el número de fila de la planilla (los títulos son la fila 1).
    const id = celda(fila, 'id') || 'fila-' + (i + 2);
    if (vistos.has(id)) return;
    vistos.add(id);
    const p = leerPrecio(celda(fila, 'p')), antes = leerPrecio(celda(fila, 'antes'));
    productos.push({ id, n, cat: celda(fila, 'cat'), d: celda(fila, 'd'), p, antes: p && antes > p ? antes : null, img: linkFoto(celda(fila, 'img')) });
  });
  return productos;
}

export const productosDesdeCSV = texto => productosDesdeFilas(leerCSV(texto));
