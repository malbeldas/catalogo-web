// E2E del catálogo: Chromium emulando un celular de 375×740 táctil (SPEC.md §11, CLAUDE.md §4.4).
import { defineConfig } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    browserName: 'chromium',
    viewport: { width: 375, height: 740 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    locale: 'es-AR',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `node tests/e2e/servidor.js ${PORT}`,
    url: `http://localhost:${PORT}/tienda.html`,
    reuseExistingServer: !process.env.CI,
  },
});
