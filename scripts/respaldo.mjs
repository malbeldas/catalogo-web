/* Tarea "respaldo" (SPEC.md §4): baja la planilla publicada del comercio y, si es válida y cambió,
   actualiza catalogo-respaldo.json. La web usa esa copia cuando la planilla no responde (AC-010-4).
   Uso: node scripts/respaldo.mjs [tienda.json] [catalogo-respaldo.json] */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { armarRespaldo, mismoRespaldo, esPestana, ajustesDesdeCSV } from '../core/datos.js';

const leerJSON = async ruta => { try { return JSON.parse(await readFile(ruta, 'utf8')); } catch { return null; } };

export async function actualizarRespaldo({ tienda: rutaTienda = 'tienda.json', salida = 'catalogo-respaldo.json', fetch = globalThis.fetch, ahora = () => new Date() } = {}) {
  const tienda = await leerJSON(rutaTienda);
  const pl = tienda?.planilla || {};
  if (!pl.web) return { estado: 'sin-planilla' };

  const bajar = async url => {
    if (!url) return null;
    try { const r = await fetch(url, { cache: 'no-store' }); return r.ok ? await r.text() : null; } catch { return null; }
  };
  const [web, ajustes] = await Promise.all([bajar(pl.web), bajar(pl.ajustes)]);
  const previo = await leerJSON(salida);
  // Si Ajustes falla se conservan los ajustes de la copia anterior.
  const aj = esPestana(ajustes, 'ajuste') ? ajustesDesdeCSV(ajustes) : previo?.ajustes || {};
  const nuevo = armarRespaldo(web, aj, tienda);

  if (!nuevo) return { estado: 'invalido' };
  if (mismoRespaldo(previo, nuevo)) return { estado: 'sin-cambios', productos: nuevo.productos.length };
  await writeFile(salida, JSON.stringify({ actualizado: ahora().toISOString(), ...nuevo }, null, 1) + '\n');
  return { estado: 'actualizado', productos: nuevo.productos.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [tienda, salida] = process.argv.slice(2);
  const r = await actualizarRespaldo({ ...(tienda && { tienda }), ...(salida && { salida }) });
  const textos = {
    'sin-planilla': 'tienda.json no tiene planilla.web: no hay nada que respaldar.',
    'sin-cambios': `El catálogo no cambió (${r.productos} productos).`,
    actualizado: `Respaldo actualizado: ${r.productos} productos.`,
    invalido: 'La planilla no respondió o no es válida: se conserva la copia anterior.',
  };
  console.log(textos[r.estado]);
  // Una planilla rota deja la tarea en rojo para que el aviso llegue por mail; la copia buena queda intacta.
  if (r.estado === 'invalido') process.exitCode = 1;
}
