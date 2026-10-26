/* Lectura de un .xlsx sin dependencias (SPEC.md §3): Excel, o una Hoja de Google bajada como xlsx.
   Devuelve cada hoja como filas de textos, igual que leerCSV, para que el resto no sepa de qué archivo vino.
   De una celda con fórmula se toma el último valor calculado que guardó el programa. */
import { inflateRawSync } from 'node:zlib';

// Archivos del zip: el directorio central al final dice dónde empieza cada uno y cómo está comprimido.
export function leerZip(buf) {
  let fin = buf.length - 22;
  while (fin >= 0 && buf.readUInt32LE(fin) !== 0x06054b50) fin--;
  if (fin < 0) throw new Error('no es un zip');
  const archivos = new Map();
  let p = buf.readUInt32LE(fin + 16);
  for (let i = buf.readUInt16LE(fin + 10); i > 0; i--) {
    const metodo = buf.readUInt16LE(p + 10), tam = buf.readUInt32LE(p + 20), largoNombre = buf.readUInt16LE(p + 28);
    const extra = buf.readUInt16LE(p + 30), coment = buf.readUInt16LE(p + 32), local = buf.readUInt32LE(p + 42);
    const nombre = buf.toString('utf8', p + 46, p + 46 + largoNombre);
    const datos = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const crudo = buf.subarray(datos, datos + tam);
    archivos.set(nombre, metodo === 8 ? inflateRawSync(crudo) : crudo);
    p += 46 + largoNombre + extra + coment;
  }
  return archivos;
}

const ENTIDADES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const texto = s => s.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (m, e) =>
  e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENTIDADES[e] ?? m);
// Todo el texto de los <t> de un pedazo de XML (un texto con formato viene partido en varios).
const textos = xml => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>|<t(?:\s[^>]*)?\/>/g)].map(m => texto(m[1] ?? '')).join('');
const atributo = (tag, nombre) => (tag.match(new RegExp(`\\s${nombre}="([^"]*)"`)) || [])[1];
const columna = ref => [...ref.replace(/\d+/g, '')].reduce((n, l) => n * 26 + l.charCodeAt(0) - 64, 0) - 1;

function filasDeHoja(xml, compartidos) {
  const filas = [];
  for (const [, fila] of xml.matchAll(/<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const celdas = [];
    for (const [, tag, cuerpo = ''] of (fila || '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const tipo = atributo(tag, 't'), v = (cuerpo.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
      const valor = tipo === 's' ? compartidos[+v] ?? '' : tipo === 'inlineStr' ? textos(cuerpo) : tipo === 'b' ? (v === '1' ? 'VERDADERO' : 'FALSO') : texto(v ?? '');
      const ref = atributo(tag, 'r');
      celdas[ref ? columna(ref) : celdas.length] = valor;
    }
    const r = (fila === undefined ? [] : Array.from(celdas, c => c ?? ''));
    filas.push(r);
  }
  return filas;
}

// [{ nombre, filas }] en el orden de las pestañas del libro.
export function leerXlsx(buf) {
  const zip = leerZip(buf), leer = n => zip.get(n)?.toString('utf8') ?? '';
  const compartidos = [...leer('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => textos(m[1]));
  const destinos = new Map([...leer('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b[^>]*>/g)]
    .map(([tag]) => [atributo(tag, 'Id'), atributo(tag, 'Target')]));
  return [...leer('xl/workbook.xml').matchAll(/<sheet\b[^>]*>/g)].map(([tag]) => {
    const destino = destinos.get(atributo(tag, 'r:id')) || '';
    const ruta = destino.startsWith('/') ? destino.slice(1) : 'xl/' + destino.replace(/^\.\//, '');
    return { nombre: texto(atributo(tag, 'name') || ''), filas: filasDeHoja(leer(ruta), compartidos) };
  });
}

export const esXlsx = buf => buf.length > 4 && buf.readUInt32LE(0) === 0x04034b50;
