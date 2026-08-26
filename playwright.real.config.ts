import { defineConfig } from '@playwright/test'

function readPort(): number {
  const port = Number(process.env.RYFRAME_E2E_FRONTEND_PORT?.trim() || '4174')
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('RYFRAME_E2E_FRONTEND_PORT 必须是 1 到 65535 之间的整数')
  }
  return port
}

const port = readPort()
const externalBaseUrl = process.env.RYFRAME_E2E_BASE_URL?.trim()
const baseURL = externalBaseUrl || `http://127.0.0.1:${port}`
const channel = process.env.PLAYWRIGHT_CHANNEL?.trim() || (process.env.CI ? undefined : 'chrome')

export default defineConfig({
  testDir: 'tests/browser-real',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['line'],
    ['html', { open: 'never', outputFolder: '.local-tests/playwright-real/report' }],
  ],
  outputDir: '.local-tests/playwright-real/results',
  use: {
    baseURL,
    ...(channel ? { channel } : {}),
    browserName: 'chromium',
    locale: 'zh-CN',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: externalBaseUrl
    ? undefined
    : {
        command: `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${port} --strictPort`,
        reuseExistingServer: false,
        timeout: 120_000,
        url: `${baseURL}/login`,
      },
})
