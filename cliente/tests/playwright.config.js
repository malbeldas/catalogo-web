// Prueba de humo del catálogo del cliente: Chromium emulando un celular de 375 × 740 táctil (SPEC.md §11).
// Si el catálogo vive en una subcarpeta del sitio (SUBCARPETA, la pone ci.yml), se sirve todo el sitio para que
// carguen las fotos y el logo de afuera de la carpeta.
import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const PORT = 4174;
const SUB = (process.env.SUBCARPETA || '').replace(/^\/|\/$/g, '');
const carpeta = fileURLToPath(new URL('..', import.meta.url));
const raiz = SUB ? fileURLToPath(new URL('../..', import.meta.url)) : carpeta;

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.js',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}/${SUB ? SUB + '/' : ''}`,
    browserName: 'chromium',
    viewport: { width: 375, height: 740 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    locale: 'es-AR',
  },
  webServer: {
    command: `node "${fileURLToPath(new URL('servidor.js', import.meta.url))}" ${PORT} "${raiz}"`,
    url: `http://localhost:${PORT}/${SUB ? SUB + '/' : ''}`,
    reuseExistingServer: !process.env.CI,
  },
});
