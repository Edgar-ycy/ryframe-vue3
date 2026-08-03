import { defineConfig, devices } from '@playwright/test'

const isCi = Boolean(process.env.CI)
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: 0,
  workers: isCi ? 1 : 2,
  reporter: isCi ? 'line' : 'list',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    locale: 'zh-CN',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  webServer: {
    command: isCi
      ? 'pnpm preview --host 127.0.0.1 --port 4173'
      : 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173',
    env: { RYFRAME_E2E: '1' },
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !isCi,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
