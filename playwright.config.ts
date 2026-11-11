import { defineConfig, devices } from '@playwright/test';

/**
 * E2E sobre el build estático servido por `astro preview` (nunca sobre el dev server).
 * Requiere un build previo: `npm run build:staging` (o `npm run validate`, que lo incluye).
 *
 * Navegador: `PLAYWRIGHT_CHANNEL` si está definida; en Windows, Microsoft Edge del sistema (siempre
 * presente) para no descargar navegadores; en el resto, el Chromium de Playwright
 * (`npx playwright install chromium`).
 */
// Lejos de 4321+: Astro dev auto-incrementa desde 4321 cuando el puerto está ocupado.
const PORT = 4399;
const channel = process.env.PLAYWRIGHT_CHANNEL ?? (process.platform === 'win32' ? 'msedge' : undefined);

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: process.env.CI !== undefined,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: channel ?? 'chromium',
      use: { ...devices['Desktop Chrome'], ...(channel === undefined ? {} : { channel }) },
    },
  ],
  webServer: {
    command: `npm run preview -- --port ${PORT}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
