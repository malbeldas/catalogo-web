/* Tarea "respaldo" (SPEC.md §4): baja la planilla del comercio y, si es válida y cambió,
   actualiza catalogo-respaldo.json.
   - Con el secreto PLANILLA_URL, la planilla es el archivo del comercio tal como lo tiene: una Hoja de Google,
     un Excel o un CSV en Drive, compartido con "cualquiera con el enlace". Nadie publica nada en Google, y la web
     muestra esta copia (planilla.privada en tienda.json). El link no está en el repo: el archivo puede tener
     los precios aunque la web los oculte (BR-PRE-001).
   - Sin el secreto, las pestañas Web y Ajustes publicadas como CSV (planilla.web y planilla.ajustes), y la web
     usa la copia cuando la planilla no responde (AC-010-4).
   Uso: PLANILLA_URL=<link> node scripts/respaldo.mjs [tienda.json] [catalogo-respaldo.json] */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { armarRespaldo, respaldoDesdeFilas, mismoRespaldo, esPestana, ajustesDesdeCSV, ajustesDesdeFilas, filaDeTitulos, leerCSV, sinAcentos } from '../core/datos.js';
import { leerXlsx, esXlsx } from './xlsx.mjs';

const leerJSON = async ruta => { try { return JSON.parse(await readFile(ruta, 'utf8')); } catch { return null; } };

// Links de descarga para el link que copió el comercio, en el orden en que se prueban.
// Una Hoja de Google se baja como xlsx; un Excel o un CSV subido a Drive, tal cual. Un link de Hoja puede ser
// también un Excel abierto en Sheets (rtpof=true), así que se prueban las dos formas.
export function enlacesDeDescarga(link) {
  const u = String(link ?? '').trim();
  const id = (u.match(/^https:\/\/(?:docs|drive)\.google\.com\/(?:spreadsheets\/d|file\/d|uc|open)(?:\/|\?(?:.*&)?id=)([\w-]{20,})/) || [])[1];
  if (!id) return u ? [u] : [];
  const hoja = `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`;
  const archivo = `https://drive.google.com/uc?export=download&id=${id}`;
  return /\/spreadsheets\//.test(u) ? [hoja, archivo] : [archivo, hoja];
}

// Un CSV del Excel en castellano viene en Latin-1 y con punto y coma.
function textoCSV(buf) {
  let s;
  try { s = new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch { s = new TextDecoder('latin1').decode(buf); }
  s = s.replace(/^﻿/, '');
  const primera = s.split(/\r?\n/, 1)[0];
  return leerCSV(s, (primera.match(/;/g) || []).length > (primera.match(/,/g) || []).length ? ';' : ',');
}

// Del archivo bajado, las filas de productos y las de ajustes (o null), o null si no es una planilla:
// una página de Google (el archivo no está compartido) o un archivo sin columna Nombre.
// En un libro gana la pestaña Productos; si no hay, la primera con columna Nombre. La pestaña Web no hace falta.
export function leerArchivo(buf) {
  if (!buf?.length) return null;
  let hojas;
  if (esXlsx(buf)) {
    try { hojas = leerXlsx(buf); } catch { return null; }
  } else {
    if (/^\s*</.test(buf.toString('utf8', 0, 200).replace(/^﻿/, ''))) return null;
    hojas = [{ nombre: '', filas: textoCSV(buf) }];
  }
  const es = (h, n) => sinAcentos(h.nombre).trim() === n;
  const productos = hojas.find(h => es(h, 'productos') && filaDeTitulos(h.filas) >= 0) ||
    hojas.find(h => !es(h, 'web') && filaDeTitulos(h.filas) >= 0);
  if (!productos) return null;
  return { productos: productos.filas, ajustes: hojas.find(h => es(h, 'ajustes'))?.filas || null };
}

// Baja el archivo del comercio probando cada link; null si ninguno trae una planilla.
export async function bajarArchivo(link, fetch = globalThis.fetch) {
  for (const url of enlacesDeDescarga(link)) {
    try {
      const r = await fetch(url, { cache: 'no-store', redirect: 'follow' });
      if (!r.ok) continue;
      const archivo = leerArchivo(Buffer.from(await r.arrayBuffer()));
      if (archivo) return archivo;
    } catch { /* se prueba el siguiente */ }
  }
  return null;
}

export async function actualizarRespaldo({ tienda: rutaTienda = 'tienda.json', salida = 'catalogo-respaldo.json', fetch = globalThis.fetch, ahora = () => new Date(), link = process.env.PLANILLA_URL } = {}) {
  const tienda = await leerJSON(rutaTienda);
  const pl = tienda?.planilla || {};
  const previo = await leerJSON(salida);
  let nuevo;

  if (link) {
    const archivo = await bajarArchivo(link, fetch);
    // Sin pestaña Ajustes valen los de tienda.json.
    nuevo = archivo && respaldoDesdeFilas(archivo.productos, archivo.ajustes ? ajustesDesdeFilas(archivo.ajustes) : {}, tienda || {});
  } else {
    if (!pl.web) return { estado: 'sin-planilla' };
    const bajar = async url => {
      if (!url) return null;
      try { const r = await fetch(url, { cache: 'no-store' }); return r.ok ? await r.text() : null; } catch { return null; }
    };
    const [web, ajustes] = await Promise.all([bajar(pl.web), bajar(pl.ajustes)]);
    // Si Ajustes falla se conservan los ajustes de la copia anterior.
    const aj = esPestana(ajustes, 'ajuste') ? ajustesDesdeCSV(ajustes) : previo?.ajustes || {};
    nuevo = armarRespaldo(web, aj, tienda);
  }

  if (!nuevo) return { estado: 'invalido' };
  if (mismoRespaldo(previo, nuevo)) return { estado: 'sin-cambios', productos: nuevo.productos.length };
  await writeFile(salida, JSON.stringify({ actualizado: ahora().toISOString(), ...nuevo }, null, 1) + '\n');
  return { estado: 'actualizado', productos: nuevo.productos.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [tienda, salida] = process.argv.slice(2);
  const r = await actualizarRespaldo({ ...(tienda && { tienda }), ...(salida && { salida }) });
  const textos = {
    'sin-planilla': 'Sin el secreto PLANILLA_URL ni planilla.web en tienda.json: no hay nada que respaldar.',
    'sin-cambios': `El catálogo no cambió (${r.productos} productos).`,
    actualizado: `Respaldo actualizado: ${r.productos} productos.`,
    invalido: process.env.PLANILLA_URL
      ? 'No se pudo leer el archivo: revisá que esté compartido con "cualquiera con el enlace" y que tenga la columna Nombre. Se conserva la copia anterior.'
      : 'La planilla no respondió o no es válida: se conserva la copia anterior.',
  };
  console.log(textos[r.estado]);
  // Una planilla rota deja la tarea en rojo para que el aviso llegue por mail; la copia buena queda intacta.
  if (r.estado === 'invalido') process.exitCode = 1;
}
