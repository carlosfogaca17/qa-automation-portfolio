import { defineConfig } from '@playwright/test';

/**
 * Configuração do Playwright para testes de API.
 * Usa exclusivamente o `request` fixture (sem browser).
 * A API alvo dos exemplos é a ServeRest (https://serverest.dev), API pública.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['json', { outputFile: '../../reports/api/results.json' }],
  ],
  timeout: 30_000,
  use: {
    baseURL: process.env.API_URL || 'https://serverest.dev',
    extraHTTPHeaders: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  },
});
