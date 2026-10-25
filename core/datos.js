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

// Filtra por categoría (null = todas) y por texto en nombre y descripción (AC-001-1).
export function buscar(productos, texto, cat = null) {
  const q = sinAcentos(texto).trim();
  return productos.filter(p => (!cat || p.cat === cat) && (!q || sinAcentos(p.n + ' ' + (p.d || '')).includes(q)));
}
