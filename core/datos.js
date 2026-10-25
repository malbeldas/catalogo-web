/* Lógica pura del catálogo: sin document, window ni localStorage (SPEC.md §6, regla hard 3).
   Todo lo de acá tiene test unitario en tests/unit/datos.test.js. */

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
