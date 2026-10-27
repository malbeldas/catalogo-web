/* Capturas reales del catálogo para la portada de venta (AC-024-4, AC-024-5). Abre los ejemplos ficticios de la demo
   (dietética y ropa, sin marcas reales: AC-024-3) en un celular de 375 × 740 y guarda en img/portada/:
   - catalogo.jpg, buscar.jpg y pedido.jpg: lo que ve el comprador en la dietética (con precios);
   - mayorista.jpg: el ejemplo de ropa con precios a consultar;
   - pueyrredon.jpg: el catálogo real de Distribuidora Pueyrredón, para el caso real (AC-024-6). Se saca del catálogo
     en vivo o, si PUEYRREDON tiene la ruta a una copia local de su repo, de esa copia;
   - compartir.jpg: la imagen de 1200 × 630 que se ve al compartir el link de la portada.
   Corre en la base con npm ci hecho; no se copia a los clientes. Se vuelve a correr si cambia el catálogo o los ejemplos.
   Uso: node scripts/capturas-portada.mjs
        PUEYRREDON=../distribuidora-pueyrredon.github.io node scripts/capturas-portada.mjs */
import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const SALIDA = join(RAIZ, 'img', 'portada');
const PUERTO = 4199;
const BASE = `http://localhost:${PUERTO}`;
const CELULAR = { viewport: { width: 375, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-AR' };
const JPG = { type: 'jpeg', quality: 82 };
const PUEYRREDON = process.env.PUEYRREDON;
const PUERTO_PUEYRREDON = 4198;
const CATALOGO_PUEYRREDON = PUEYRREDON ? `http://localhost:${PUERTO_PUEYRREDON}/catalogo/` : 'https://distribuidora-pueyrredon.github.io/catalogo/';

async function servidor(puerto = PUERTO, raiz = RAIZ, prueba = '/tienda.html') {
  const proc = spawn(process.execPath, [join(RAIZ, 'tests/e2e/servidor.js'), String(puerto), raiz], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`http://localhost:${puerto}${prueba}`)).ok) return proc; } catch { /* todavía no levantó */ }
    await new Promise(ok => setTimeout(ok, 100));
  }
  proc.kill();
  throw new Error('No levantó el servidor local');
}

// Abre un ejemplo de la demo (solo se elige con demo=1, AC-020-1), le saca la barra de demo para que se vea como
// el catálogo de un cliente y espera a que carguen las fotos que se ven.
async function abrir(pagina, tienda) {
  await pagina.goto(`${BASE}/tienda.html?t=${tienda}&demo=1`);
  await pagina.locator('#grid .pc').first().waitFor();
  await pagina.addStyleTag({ content: '#demobar{display:none!important}' });
  await pagina.evaluate(() => document.body.classList.remove('has-demo'));
  await fotosVisibles(pagina);
}

// Las fotos de abajo cargan al bajar: alcanza con las que se ven.
async function fotosVisibles(pagina) {
  await pagina.waitForFunction(() => [...document.images].filter(i => i.getBoundingClientRect().top < innerHeight).every(i => i.complete && i.naturalWidth));
}

export async function sacarCapturas() {
  await mkdir(SALIDA, { recursive: true });
  const proc = await servidor();
  const procPueyrredon = PUEYRREDON ? await servidor(PUERTO_PUEYRREDON, PUEYRREDON, '/catalogo/') : null;
  const { chromium } = await import('@playwright/test');
  const navegador = await chromium.launch();
  try {
    const p = await navegador.newPage(CELULAR);
    // Ninguna llamada fuera de la máquina: ni Google Fonts tarda, ni WhatsApp se abre.
    await p.route(u => new URL(u).hostname !== 'localhost' && !/fonts\.(googleapis|gstatic)\.com$/.test(new URL(u).hostname), r => r.abort());

    await abrir(p, 'dietetica');
    await p.screenshot({ path: join(SALIDA, 'catalogo.jpg'), ...JPG });

    await p.locator('#q').fill('miel');
    await p.waitForTimeout(400);
    await p.screenshot({ path: join(SALIDA, 'buscar.jpg'), ...JPG });

    await abrir(p, 'dietetica');
    const tarjetas = p.locator('#grid .pc');
    await tarjetas.nth(0).locator('button[data-a="+"]').tap();
    await tarjetas.nth(1).locator('button[data-a="+"]').tap();
    await tarjetas.nth(1).locator('button[data-a="+"]').tap();
    await p.locator('#cartbar').tap();
    await p.locator('#shCart').waitFor();
    await p.waitForTimeout(400);
    await p.screenshot({ path: join(SALIDA, 'pedido.jpg'), ...JPG });

    await abrir(p, 'ropa');
    await p.screenshot({ path: join(SALIDA, 'mayorista.jpg'), ...JPG });

    // El caso real: el catálogo de Pueyrredón tal como lo ven sus clientes.
    const real = await navegador.newPage(CELULAR);
    const propio = new URL(CATALOGO_PUEYRREDON).hostname;
    await real.route(u => ![propio, 'localhost'].includes(new URL(u).hostname) && !/fonts\.(googleapis|gstatic)\.com$/.test(new URL(u).hostname), r => r.abort());
    await real.goto(CATALOGO_PUEYRREDON);
    await real.locator('#grid .pc').first().waitFor();
    await fotosVisibles(real);
    await real.screenshot({ path: join(SALIDA, 'pueyrredon.jpg'), ...JPG });

    // Imagen para compartir: la captura del catálogo en un celular, sobre el fondo de la portada.
    const foto = (await readFile(join(SALIDA, 'catalogo.jpg'))).toString('base64');
    const og = await navegador.newPage({ viewport: { width: 1200, height: 630 } });
    await og.route(u => !/fonts\.(googleapis|gstatic)\.com$/.test(new URL(u).hostname), r => r.abort());
    await og.setContent(`<!doctype html><html><head><meta charset="utf-8">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap"><style>
      *{box-sizing:border-box;margin:0}
      body{width:1200px;height:630px;background:#111418;color:#fff;font-family:Inter,system-ui,sans-serif;display:flex;align-items:center;gap:56px;padding:0 0 0 84px;overflow:hidden}
      .txt{flex:1}
      .marca{display:flex;align-items:center;gap:14px;font:800 30px/1 Inter,system-ui,sans-serif}
      .marca i{width:44px;height:44px;border-radius:11px;background:#ffcc33;display:grid;grid-template-columns:1fr 1fr;gap:5px;padding:9px}
      .marca i b{background:#111418;border-radius:3px}
      h1{margin-top:40px;font:800 62px/1.04 Inter,system-ui,sans-serif;letter-spacing:-.03em}
      h1 em{font-style:normal;color:#ffcc33}
      p{margin-top:22px;color:#b9c0c9;font-size:27px;line-height:1.35}
      .tel{flex:none;width:330px;height:652px;margin:120px 84px 0 0;border-radius:44px;background:#000;padding:12px;box-shadow:0 30px 80px rgba(0,0,0,.55)}
      .tel img{display:block;width:100%;height:100%;object-fit:cover;object-position:top;border-radius:33px}
    </style></head><body>
      <div class="txt"><div class="marca"><i><b></b><b></b><b></b><b></b></i>Catálogo web</div>
      <h1>Tu catálogo en el celular de <em>tus clientes</em>.</h1>
      <p>Tus productos con tu logo. Te piden por WhatsApp.</p></div>
      <div class="tel"><img src="data:image/jpeg;base64,${foto}" alt=""></div>
    </body></html>`, { waitUntil: 'load' });
    await og.evaluate(() => document.fonts.ready);
    await og.screenshot({ path: join(SALIDA, 'compartir.jpg'), ...JPG });
  } finally {
    await navegador.close();
    proc.kill();
    procPueyrredon?.kill();
  }
  return SALIDA;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(`Listo: ${await sacarCapturas()}`);
}
