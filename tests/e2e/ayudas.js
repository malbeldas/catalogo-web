// Ayudas comunes de los E2E.
// - Toda llamada fuera de localhost se corta (nunca Google ni WhatsApp reales) y queda anotada.
// - simularCatalogo() reemplaza los datos del comercio por los del test; abrirPlanilla() los sirve como la planilla publicada.
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

// Catálogo armado en tiendas/<id>.json, como los ejemplos de la demo.
export async function simularCatalogo(page, tienda) {
  const datos = { id: 'pled', nombre: 'Comercio de prueba', bajada: 'Catálogo simulado', tipo: 'Minorista', color: '#0f766e', wa: '5491100000000', precios: true, productos: [], ...tienda };
  const cuerpo = JSON.stringify(datos);
  await page.route('**/tiendas/*.json', async r => {
    // Una respuesta simulada no pasa por la red emulada de Chromium: la demora se aplica acá.
    const red = redes.get(page);
    if (red) await new Promise(ok => setTimeout(ok, red.latencia + Buffer.byteLength(cuerpo) / red.bajada * 1000));
    return r.fulfill({ body: cuerpo, contentType: 'application/json' });
  });
  return datos;
}

// Celular de gama media con 4G (AC-001-3): CPU 4 veces más lenta y ~9 Mbps de bajada con 170 ms de latencia.
const redes = new WeakMap();
export async function emularCelular4G(page) {
  const red = { latencia: 170, bajada: 9e6 / 8, subida: 1.5e6 / 8 };
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: red.latencia, downloadThroughput: red.bajada, uploadThroughput: red.subida });
  redes.set(page, red);
}

// Planilla publicada del comercio (UC-010): tienda.json apunta a planilla.web y esa URL devuelve el CSV.
// Cambiar planilla.csv entre recargas simula que el comercio editó su planilla.
export const URL_PLANILLA = 'https://docs.google.com/spreadsheets/d/e/PRUEBA/pub?gid=0&single=true&output=csv';
export const TITULOS_PLANILLA = ['Código', 'Nombre', 'Categoría', 'Descripción', 'Precio', 'Precio anterior', 'Foto', 'Visible'];
const celdaCSV = v => /[",\n]/.test(String(v ?? '')) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? '');
export const aCSV = filas => [TITULOS_PLANILLA, ...filas].map(f => f.map(celdaCSV).join(',')).join('\r\n');
// Con ajustes ([['Precios', 'NO'], ...]) también se publica la pestaña Ajustes; planilla.ajustesCSV se puede cambiar
// entre recargas, y con planilla.ajustesCaida = true esa pestaña responde con error.
export const URL_AJUSTES = URL_PLANILLA.replace('gid=0', 'gid=1');
export const ajustesCSV = filas => [['Ajuste', 'Valor', 'Para qué sirve'], ...filas].map(f => f.map(celdaCSV).join(',')).join('\r\n');
export async function abrirPlanilla(page, filas, tienda, ajustes) {
  const planilla = { csv: aCSV(filas), lecturas: 0, ajustesCSV: ajustes && ajustesCSV(ajustes), ajustesCaida: false };
  const urls = { web: URL_PLANILLA, ...(ajustes && { ajustes: URL_AJUSTES }) };
  const datos = await simularCatalogo(page, { productos: undefined, planilla: urls, ...tienda });
  // Registradas después del corte de llamadas externas, así que estas URLs se atienden acá.
  await page.route(URL_PLANILLA, r => { planilla.lecturas++; return r.fulfill({ body: planilla.csv, contentType: 'text/csv' }); });
  await page.route(URL_AJUSTES, r => planilla.ajustesCaida ? r.fulfill({ status: 500 }) : r.fulfill({ body: planilla.ajustesCSV, contentType: 'text/csv' }));
  await page.goto('/tienda.html?t=pled&demo=0');
  await expect(page.locator('#grid .pc, #empty').first()).toBeVisible();
  return planilla;
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
