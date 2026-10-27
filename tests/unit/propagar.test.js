// UC-022 — Llevar una mejora del núcleo a los clientes: scripts/propagar-nucleo.mjs (SPEC.md §2, §9; STORY-008).
// git, gh y el alta se simulan: el test no clona ni abre PRs de verdad.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { propagar } from '../../scripts/propagar-nucleo.mjs';

// Simula git y gh: `cambios` dice si el alta dejó algo distinto; `fallan` hace fallar comandos por repo.
function simulador({ cambios = {}, fallan = {} } = {}) {
  const llamadas = [];
  let actual = '';
  const run = (cmd, args) => {
    llamadas.push([cmd, ...args].join(' '));
    if (cmd === 'git' && args[0] === 'clone') actual = args[3].replace('https://github.com/', '').replace('.git', '');
    const falla = fallan[actual];
    if (falla && llamadas.at(-1).includes(falla)) { const e = new Error(`falló ${falla}`); e.stderr = `falló ${falla}`; e.stdout = `falló ${falla}`; throw e; }
    if (cmd === 'git' && args[0] === 'status') return cambios[actual] ? ' M core/datos.js' : '';
    if (cmd === 'gh') return `https://github.com/${actual}/pull/9`;
    return '';
  };
  const altas = [];
  const alta = async (dir, opciones) => { altas.push({ repo: actual, ...opciones }); };
  return { run, alta, llamadas, altas, version: 'abc1234' };
}

test('AC-022-1 cada cliente recibe el núcleo nuevo en un PR, con el alta en su carpeta', async () => {
  const s = simulador({ cambios: { 'a/sitio': true } });
  const [r] = await propagar([{ repo: 'a/sitio', carpeta: 'catalogo' }], s);
  assert.deepEqual(r, { repo: 'a/sitio', estado: 'PR', detalle: 'https://github.com/a/sitio/pull/9' });
  assert.equal(s.altas[0].sub, 'catalogo');
  assert.ok(s.llamadas.some(l => l.startsWith('node --test tests/*.test.js')), 'corre sus tests antes del PR');
  assert.ok(s.llamadas.some(l => l === 'git push -q -u origin nucleo-abc1234'));
  // Nunca a main directo: el merge lo hace Maxi con el CI en verde.
  assert.ok(!s.llamadas.some(l => /push.*\bmain\b/.test(l)));
  assert.ok(s.llamadas.some(l => l.startsWith('gh api repos/a/sitio/pulls') && l.includes('base=main')));
});

test('AC-022-1 un cliente que ya tiene el núcleo queda al día, sin PR', async () => {
  const s = simulador();
  const [r] = await propagar([{ repo: 'a/sitio' }], s);
  assert.equal(r.estado, 'al día');
  assert.ok(!s.llamadas.some(l => l.startsWith('gh') || l.startsWith('git push')));
});

test('UC-022 un cliente con tests en rojo no recibe PR y no frena a los demás', async () => {
  const s = simulador({ cambios: { 'a/roto': true, 'b/bien': true }, fallan: { 'a/roto': 'node --test' } });
  const [roto, bien] = await propagar([{ repo: 'a/roto' }, { repo: 'b/bien' }], s);
  assert.equal(roto.estado, 'error');
  assert.match(roto.detalle, /sus tests fallan/);
  assert.equal(bien.estado, 'PR');
  assert.ok(!s.llamadas.some(l => l.startsWith('gh api repos/a/roto')));
});

test('UC-022 si no se puede clonar o pushear un cliente, queda el error y sigue con el siguiente', async () => {
  const s = simulador({ cambios: { 'b/bien': true }, fallan: { 'a/sin-permiso': 'git clone' } });
  const r = await propagar([{ repo: 'a/sin-permiso' }, { repo: 'b/bien' }], s);
  assert.deepEqual(r.map(x => x.estado), ['error', 'PR']);
});

test('UC-022 clientes.json lista cada repo de cliente con su carpeta', async () => {
  const clientes = JSON.parse(await readFile(new URL('../../clientes.json', import.meta.url), 'utf8'));
  assert.ok(clientes.length > 0);
  for (const c of clientes) assert.match(c.repo, /^[\w.-]+\/[\w.-]+$/);
  assert.ok(clientes.some(c => c.repo === 'distribuidora-pueyrredon/distribuidora-pueyrredon.github.io' && c.carpeta === 'catalogo'));
});

test('UC-022 con --simular se ven los cambios y los tests, sin pushear ni abrir PR', async () => {
  const s = simulador({ cambios: { 'a/sitio': true } });
  const [r] = await propagar([{ repo: 'a/sitio' }], { ...s, simular: true });
  assert.equal(r.estado, 'simulado');
  assert.match(r.detalle, /core\/datos\.js/);
  assert.ok(!s.llamadas.some(l => l.startsWith('gh') || l.startsWith('git push') || l.includes('commit')));
});
