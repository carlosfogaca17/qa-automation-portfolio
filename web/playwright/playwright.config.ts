import { defineConfig, devices } from '@playwright/test';

/**
 * Configuração do Playwright para testes Web (UI).
 * A URL base é lida de variável de ambiente com fallback para o demo público
 * "Sauce Demo" (sauceDemo), mantendo o projeto executável fora da caixa.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { outputDir: 'playwright-report', open: 'never' }],
    ['json', { outputFile: '../../reports/web/results.json' }],
  ],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: process.env.BASE_URL || 'https://www.saucedemo.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
