// Ayudas comunes de los E2E.
// - Toda llamada fuera de localhost se corta (nunca Google ni WhatsApp reales) y queda anotada.
// - simularCatalogo() reemplaza los datos del comercio por los del test.
// - generarProductos() arma catálogos de cualquier tamaño.
import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  externas: async ({}, use) => { await use([]); },
  page: async ({ page, externas }, use) => {
    await page.route(u => !['localhost', '127.0.0.1'].includes(u.hostname), r => {
      externas.push(r.request().url());
      return r.abort('blockedbyclient');
    });
    await use(page);
  },
});
export { expect };

// Hoy el catálogo se lee de tiendas/<id>.json; cuando llegue la planilla (STORY-004, #7)
// esta función pasa a interceptar las URLs CSV y los tests no cambian.
export async function simularCatalogo(page, tienda) {
  const datos = { id: 'pled', nombre: 'Comercio de prueba', bajada: 'Catálogo simulado', tipo: 'Minorista', color: '#0f766e', wa: '5491100000000', precios: true, productos: [], ...tienda };
  await page.route('**/tiendas/*.json', r => r.fulfill({ json: datos }));
  return datos;
}

// Abre el catálogo simulado tal como lo ve un comprador (sin barra de demo).
export async function abrirCatalogo(page, tienda) {
  const datos = await simularCatalogo(page, tienda);
  await page.goto('/tienda.html?t=pled&demo=0');
  await expect(page.locator('#stName')).toHaveText(datos.nombre);
  return datos;
}

// N productos repartidos en las categorías dadas, en orden.
export function generarProductos(n, categorias = ['General']) {
  return Array.from({ length: n }, (_, i) => ({
    id: 'p' + (i + 1),
    n: `Producto ${i + 1}`,
    cat: categorias[Math.floor(i * categorias.length / n)],
    d: `Descripción del producto ${i + 1}`,
    p: 1000 + i,
  }));
}
