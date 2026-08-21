import { defineConfig } from '@playwright/test'

const port = 4173
const channel = process.env.PLAYWRIGHT_CHANNEL?.trim()

export default defineConfig({
  testDir: 'tests/browser',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [['line'], ['html', { open: 'never', outputFolder: '.local-tests/playwright/report' }]]
    : 'line',
  outputDir: '.local-tests/playwright/results',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    ...(channel ? { channel } : {}),
    browserName: 'chromium',
    locale: 'zh-CN',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${port} --strictPort`,
    reuseExistingServer: false,
    timeout: 120_000,
    url: `http://127.0.0.1:${port}/login`,
  },
})
