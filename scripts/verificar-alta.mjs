/* Revisa la carpeta de un cliente antes de publicarla (UC-021, AC-021-1). Lista cada problema y termina en
   rojo si hay alguno. Uso: [PLANILLA_URL=<link>] node scripts/verificar-alta.mjs <carpeta del cliente>
   Con planilla.privada se revisa el archivo del comercio si se pasa su link, y la copia catalogo-respaldo.json. */
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { esPestana, productosDesdeCSV, ajustesDesdeCSV, ajustesDesdeFilas, respaldoDesdeFilas, numeroWhatsApp, sinAcentos } from '../core/datos.js';
import { bajarArchivo } from './respaldo.mjs';
import { esLinkResena } from './alta.mjs';

const BASE = fileURLToPath(new URL('..', import.meta.url));
const MOLDE = JSON.parse(await readFile(join(BASE, 'cliente', 'tienda.json'), 'utf8'));
const CSV_PUBLICADO = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/e\/[^/]+\/pub\?.*output=csv/;

// tienda.json completo (SPEC.md §3). El WhatsApp de acá se usa si Ajustes no tiene uno o la planilla no responde.
export function revisarTienda(t) {
  if (!t || typeof t !== 'object') return ['tienda.json no existe o no es JSON válido'];
  const mal = [];
  if (!String(t.nombre ?? '').trim() || t.nombre === MOLDE.nombre) mal.push('tienda.json: falta el nombre del comercio');
  if (!/^#[0-9a-f]{6}$/i.test(t.color ?? '')) mal.push('tienda.json: color tiene que ser un hex como #1f2937');
  const wa = numeroWhatsApp(t.wa);
  if (!/^54\d{10,11}$/.test(wa)) mal.push('tienda.json: wa tiene que ser el WhatsApp con 54 y código de área, sin + ni espacios');
  if (!t.planilla?.privada) for (const k of ['web', 'ajustes'])
    if (!CSV_PUBLICADO.test(t.planilla?.[k] ?? '')) mal.push(`tienda.json: planilla.${k} tiene que ser el link CSV de "Publicar en la Web", o usá planilla.privada con el secreto PLANILLA_URL`);
  if (!t.logo) mal.push('tienda.json: falta el logo');
  if (t.resenas && !esLinkResena(t.resenas)) mal.push('tienda.json: resenas tiene que ser el link de "Pedir reseñas" del Perfil de Empresa de Google (https://g.page/r/…/review)');
  return mal;
}

// Las dos pestañas publicadas son las correctas y, con precios ocultos, Web no trae importes (BR-PRE-001, regla hard 4).
export function revisarPestanas(web, ajustes, tienda = {}) {
  const mal = [];
  if (!esPestana(web, 'nombre')) mal.push('planilla.web no devuelve la pestaña Web: revisá que esté publicada como CSV');
  else if (!productosDesdeCSV(web).length) mal.push('la pestaña Web no tiene productos');
  if (!esPestana(ajustes, 'ajuste')) mal.push('planilla.ajustes no devuelve la pestaña Ajustes: revisá que esté publicada como CSV');
  else if (esPestana(web, 'nombre')) {
    const aj = ajustesDesdeCSV(ajustes), precios = aj.precios ?? !!tienda.precios;
    if (!precios && productosDesdeCSV(web).some(p => p.p || p.antes))
      mal.push('Precios = NO pero la pestaña Web publica importes (BR-PRE-001): no publiques la pestaña Productos');
  }
  return mal;
}

// Con planilla.privada: el archivo del comercio se lee (si se revisa con su link) y la copia publicada
// no trae importes cuando los precios están ocultos (BR-PRE-001, regla hard 4).
export function revisarPrivada(archivo, respaldo, tienda = {}, { conLink = false } = {}) {
  const mal = [];
  if (conLink && !archivo) mal.push('PLANILLA_URL no trae una planilla: revisá que el archivo esté compartido con "cualquiera con el enlace" y tenga la columna Nombre');
  else if (archivo && !respaldoDesdeFilas(archivo.productos, archivo.ajustes ? ajustesDesdeFilas(archivo.ajustes) : {}, tienda))
    mal.push('el archivo del comercio no tiene productos con nombre');
  if (!respaldo?.productos?.length) mal.push('falta catalogo-respaldo.json: guardá el link en el secreto PLANILLA_URL y corré la tarea respaldo');
  else if (!(respaldo.ajustes?.precios ?? !!tienda.precios) && respaldo.productos.some(p => p.p || p.antes))
    mal.push('Precios = NO pero catalogo-respaldo.json tiene importes (BR-PRE-001)');
  return mal;
}

// Regla hard 7: nada de Pueyrredón, PLED ni "Mostrador", salvo el nombre del propio cliente.
const MARCAS = [['Pueyrredón', /pueyrred[oó]n/i], ['PLED', /\bpled\b/i], ['Mostrador', /mostrador/i]];
export function marcasAjenas(texto, nombreCliente = '') {
  const propio = sinAcentos(nombreCliente);
  return MARCAS.filter(([marca, re]) => !(marca !== 'Mostrador' && re.test(propio)) && re.test(texto)).map(([marca]) => marca);
}

// core/ igual al de la base, sin demo.js (regla hard 2).
export async function revisarNucleo(carpeta, base = BASE) {
  const mal = [], dir = join(carpeta, 'core');
  if (!existsSync(dir)) return ['falta core/: corré node scripts/alta.mjs'];
  const delCliente = await readdir(dir), deLaBase = (await readdir(join(base, 'core'))).filter(f => f !== 'demo.js');
  if (delCliente.includes('demo.js')) mal.push('core/demo.js es solo de la base');
  for (const f of deLaBase) {
    if (!delCliente.includes(f)) mal.push(`falta core/${f}`);
    else if (!(await readFile(join(dir, f))).equals(await readFile(join(base, 'core', f)))) mal.push(`core/${f} no es igual al de la base: no se edita en un cliente`);
  }
  return mal;
}

export async function verificarAlta(carpeta, { fetch = globalThis.fetch, base = BASE, link = '' } = {}) {
  let tienda = null;
  try { tienda = JSON.parse(await readFile(join(carpeta, 'tienda.json'), 'utf8')); } catch {}
  const mal = [...revisarTienda(tienda), ...await revisarNucleo(carpeta, base)];
  if (!tienda) return mal;
  if (tienda.logo && !existsSync(join(carpeta, tienda.logo))) mal.push(`no existe el logo ${tienda.logo}`);
  if (!existsSync(join(carpeta, 'index.html'))) mal.push('falta index.html: corré node scripts/alta.mjs');
  if (esLinkResena(tienda.resenas) && !existsSync(join(carpeta, 'resena.html'))) mal.push('falta resena.html: corré node scripts/alta.mjs');
  for (const f of ['index.html', 'resena.html', 'tienda.json', ...(await readdir(join(carpeta, 'core')).catch(() => [])).map(f => 'core/' + f)]) {
    const texto = await readFile(join(carpeta, f), 'utf8').catch(() => '');
    for (const marca of marcasAjenas(texto, tienda.nombre)) mal.push(`${f} menciona "${marca}" (regla hard 7)`);
  }
  if (tienda.planilla?.privada) {
    let respaldo = null;
    try { respaldo = JSON.parse(await readFile(join(carpeta, 'catalogo-respaldo.json'), 'utf8')); } catch {}
    mal.push(...revisarPrivada(link ? await bajarArchivo(link, fetch) : null, respaldo, tienda, { conLink: !!link }));
    return mal;
  }
  const bajar = async url => { try { const r = await fetch(url, { cache: 'no-store' }); return r.ok ? await r.text() : null; } catch { return null; } };
  if (CSV_PUBLICADO.test(tienda.planilla?.web ?? '') && CSV_PUBLICADO.test(tienda.planilla?.ajustes ?? ''))
    mal.push(...revisarPestanas(await bajar(tienda.planilla.web), await bajar(tienda.planilla.ajustes), tienda));
  return mal;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const carpeta = process.argv[2];
  if (!carpeta) { console.error('Uso: node scripts/verificar-alta.mjs <carpeta del cliente>'); process.exit(2); }
  const mal = await verificarAlta(carpeta, { link: process.env.PLANILLA_URL || '' });
  if (!mal.length) console.log('✓ El alta está lista para publicar.');
  else { console.log(`Hay ${mal.length} cosas para corregir:`); for (const m of mal) console.log('✗ ' + m); process.exitCode = 1; }
}
