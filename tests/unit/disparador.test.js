// Disparador de la tarea respaldo (AC-010-6): disparador/Codigo.gs corre en Apps Script; acá en Node,
// con PropertiesService, UrlFetchApp y ScriptApp simulados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const codigo = readFileSync(new URL('../../disparador/Codigo.gs', import.meta.url), 'utf8');

// Carga el script con estas propiedades; respuestas[repo] es el código HTTP o un Error. Devuelve las funciones y lo anotado.
function cargar(props = {}, respuestas = {}) {
  const pedidos = [], disparadores = [], borrados = [];
  const ctx = vm.createContext({
    console: { log() {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] ?? null }) },
    UrlFetchApp: {
      fetch(url, op) {
        pedidos.push({ url, ...op });
        const repo = url.match(/repos\/([^/]+\/[^/]+)\//)[1];
        const r = respuestas[repo] ?? 204;
        if (r instanceof Error) throw r;
        return { getResponseCode: () => r };
      },
    },
    ScriptApp: {
      getProjectTriggers: () => disparadores,
      deleteTrigger: t => { borrados.push(t); disparadores.splice(disparadores.indexOf(t), 1); },
      newTrigger: funcion => ({ timeBased: () => ({ everyMinutes: m => ({ create: () => disparadores.push({ funcion, m, getHandlerFunction: () => funcion }) }) }) }),
    },
  });
  const f = vm.runInContext(`${codigo}\n;({ disparar, instalar, leerClientes })`, ctx);
  return { ...f, pedidos, disparadores, borrados };
}

const CLIENTES = 'distribuidora-pueyrredon/distribuidora-pueyrredon.github.io\nmalbeldas/catalogo-kiosco';
const TOKENS = { 'TOKEN_distribuidora-pueyrredon': 'tok-dp', TOKEN_malbeldas: 'tok-mb' };

test('AC-010-6 pide la tarea respaldo en la rama main de cada cliente, con el token de su cuenta', () => {
  const s = cargar({ CLIENTES, ...TOKENS });
  assert.equal(s.disparar(), 2);
  assert.deepEqual(s.pedidos.map(p => p.url), [
    'https://api.github.com/repos/distribuidora-pueyrredon/distribuidora-pueyrredon.github.io/actions/workflows/respaldo.yml/dispatches',
    'https://api.github.com/repos/malbeldas/catalogo-kiosco/actions/workflows/respaldo.yml/dispatches',
  ]);
  assert.deepEqual(s.pedidos.map(p => p.headers.Authorization), ['Bearer tok-dp', 'Bearer tok-mb']);
  for (const p of s.pedidos) {
    assert.equal(p.method, 'post');
    assert.equal(p.payload, '{"ref":"main"}');
    assert.equal(p.muteHttpExceptions, true);
  }
});

test('AC-010-6 un cliente con error no corta a los demás, y la corrida falla al final para que llegue el mail', () => {
  const s = cargar(
    { CLIENTES: `${CLIENTES}\nmalbeldas/otro\notra-cuenta/catalogo`, ...TOKENS },
    { 'distribuidora-pueyrredon/distribuidora-pueyrredon.github.io': 401, 'malbeldas/catalogo-kiosco': new Error('Timeout') },
  );
  assert.throws(() => s.disparar(), e => {
    assert.match(e.message, /3 cliente/);
    assert.match(e.message, /distribuidora-pueyrredon\.github\.io: GitHub respondió 401 \(el token venció/);
    assert.match(e.message, /malbeldas\/catalogo-kiosco: Timeout/);
    assert.match(e.message, /otra-cuenta\/catalogo: falta la propiedad TOKEN_otra-cuenta/);
    return true;
  });
  // malbeldas/otro se pidió igual, después de los que fallaron.
  assert.equal(s.pedidos.at(-1).url.includes('malbeldas/otro/'), true);
  assert.equal(s.pedidos.length, 3);
});

test('AC-010-6 sin clientes o con una línea que no es un repo, la corrida falla en lugar de no hacer nada', () => {
  assert.throws(() => cargar({}).disparar(), /CLIENTES está vacía/);
  const s = cargar({ CLIENTES: 'malbeldas/catalogo-kiosco, https://github.com/x/y', ...TOKENS });
  assert.throws(() => s.disparar(), /"https:\/\/github\.com\/x\/y" no es un repo/);
  assert.equal(s.pedidos.length, 1);
});

test('AC-010-6 leerClientes acepta líneas o comas, ignora vacíos y no repite', () => {
  const { leerClientes } = cargar();
  assert.deepEqual(JSON.parse(JSON.stringify(leerClientes(' a/b ,\n\nc/d.github.io\na/b\n'))), { repos: ['a/b', 'c/d.github.io'], errores: [] });
});

test('AC-010-6 instalar deja un solo disparador cada 15 minutos y hace la primera corrida', () => {
  const s = cargar({ CLIENTES, ...TOKENS });
  s.instalar();
  s.instalar();
  assert.equal(s.disparadores.length, 1);
  assert.equal(s.disparadores[0].funcion, 'disparar');
  assert.equal(s.disparadores[0].m, 15);
  assert.equal(s.borrados.length, 1);
  assert.equal(s.pedidos.length, 4);
});
