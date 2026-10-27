/* Lleva el núcleo de la base a los clientes (UC-022, AC-022-1). Para cada cliente de clientes.json: clona su repo,
   corre el alta (reemplaza core/, la tarea de respaldo, sus tests y su ci.yml; no toca tienda.json, img/ ni la
   planilla), corre sus tests unitarios y abre un PR. Su CI corre la prueba de humo y el merge lo hace Maxi.
   Un cliente que falla no frena a los demás: al final se lista cómo quedó cada uno y sale en rojo si alguno falló.
   Uso: node scripts/propagar-nucleo.mjs [--simular] [repo del cliente…]   (sin repos, todos los de clientes.json)
   Con --simular no pushea ni abre PRs: muestra qué archivos cambiarían y si sus tests pasan. */
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { armarAlta } from './alta.mjs';

const BASE = fileURLToPath(new URL('..', import.meta.url));
const FIRMA = ['-c', 'user.name=Claude', '-c', 'user.email=noreply@anthropic.com'];

const ejecutar = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

// Un cliente: devuelve { repo, estado: 'al día' | 'PR' | 'error', detalle }.
export async function propagarCliente({ repo, carpeta = '' }, { run = ejecutar, base = BASE, alta = armarAlta, version, simular = false } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'propagar-'));
  try {
    run('git', ['clone', '--depth', '1', `https://github.com/${repo}.git`, dir]);
    const rama = `nucleo-${version}`;
    run('git', ['checkout', '-b', rama], dir);
    await alta(dir, { base, sub: carpeta });
    const cambios = run('git', ['status', '--porcelain'], dir);
    if (!cambios) return { repo, estado: 'al día', detalle: 'ya tenía este núcleo' };
    try {
      run('node', ['--test', 'tests/*.test.js'], join(dir, carpeta));
    } catch (e) {
      return { repo, estado: 'error', detalle: `sus tests fallan con el núcleo nuevo, no se abrió PR:\n${e.stdout || e.message}` };
    }
    if (simular) return { repo, estado: 'simulado', detalle: `sus tests pasan; cambiaría:\n${cambios}` };
    run('git', ['add', '-A'], dir);
    run('git', [...FIRMA, 'commit', '-q', '-m', `Núcleo de la base (${version})`], dir);
    run('git', ['push', '-q', '-u', 'origin', rama], dir);
    const cuerpo = `**Antes:** el catálogo tiene el núcleo anterior.\n\n**Después:** tiene el núcleo de malbeldas/catalogo-web@${version}: \`core/\`, la tarea de respaldo, los tests y \`ci.yml\`. \`tienda.json\`, \`img/\` y la planilla no cambian (AC-022-1).\n\n**Cómo:** \`node scripts/propagar-nucleo.mjs\` en la base. Sus tests unitarios pasaron antes de abrir el PR; la prueba de humo corre en el CI. Mergear solo con el CI en verde.`;
    const pr = run('gh', ['api', `repos/${repo}/pulls`, '-f', `title=Núcleo de la base (${version})`, '-f', `head=${rama}`, '-f', 'base=main', '-f', `body=${cuerpo}`, '--jq', '.html_url']);
    return { repo, estado: 'PR', detalle: pr };
  } catch (e) {
    return { repo, estado: 'error', detalle: (e.stderr || e.message || '').trim() };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function propagar(clientes, opciones = {}) {
  const resultados = [];
  for (const c of clientes) resultados.push(await propagarCliente(c, opciones));
  return resultados;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const todos = JSON.parse(await readFile(join(BASE, 'clientes.json'), 'utf8'));
  const simular = process.argv.includes('--simular');
  const pedidos = process.argv.slice(2).filter(a => a !== '--simular');
  const clientes = pedidos.length ? todos.filter(c => pedidos.includes(c.repo)) : todos;
  if (!clientes.length) { console.error('Ningún cliente coincide con clientes.json'); process.exit(2); }
  const version = ejecutar('git', ['rev-parse', '--short', 'HEAD'], BASE);
  const resultados = await propagar(clientes, { version, simular });
  for (const r of resultados) console.log(`${r.estado === 'error' ? '✗' : '✓'} ${r.repo}: ${r.estado} · ${r.detalle}`);
  process.exit(resultados.some(r => r.estado === 'error') ? 1 : 0);
}
