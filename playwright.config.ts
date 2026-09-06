import { defineConfig } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const port = 4173
const serverMode = process.env.RYFRAME_E2E_SERVER?.trim() || 'dev'
if (!['dev', 'preview'].includes(serverMode)) {
  throw new Error('RYFRAME_E2E_SERVER 必须为 dev 或 preview')
}
const channel = process.env.PLAYWRIGHT_CHANNEL?.trim() || (process.env.CI ? undefined : 'chrome')
const serverCommand =
  serverMode === 'preview'
    ? 'node scripts/run-browser-preview-harness-server.mjs ' + port
    : 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port ' + port + ' --strictPort'
const reportDirectory = `.local-tests/playwright/report/${serverMode}`
const resultsDirectory = `.local-tests/playwright/results/${serverMode}`

for (const directory of [reportDirectory, resultsDirectory]) {
  mkdirSync(directory, { recursive: true })
}

export default defineConfig({
  testDir: 'tests/browser',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [['line'], ['html', { open: 'never', outputFolder: reportDirectory }]]
    : 'line',
  outputDir: resultsDirectory,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    ...(channel ? { channel } : {}),
    browserName: 'chromium',
    locale: 'zh-CN',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: serverCommand,
    reuseExistingServer: false,
    timeout: 120_000,
    url: `http://127.0.0.1:${port}/login`,
  },
})
