import { defineConfig } from '@playwright/test'
import { mkdirSync } from 'node:fs'

import { loadSmokeBrowserConfiguration } from './scripts/smoke-browser-configuration.mjs'
const { serverMode, channel, attempt: artifactAttempt } = loadSmokeBrowserConfiguration()
const port = 4173
const serverCommand =
  serverMode === 'preview'
    ? 'node scripts/run-browser-preview-harness-server.mjs ' + port
    : 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port ' + port + ' --strictPort'
const reportDirectory = `.local-tests/playwright/report/${serverMode}/${artifactAttempt}`
const resultsDirectory = `.local-tests/playwright/results/${serverMode}/${artifactAttempt}`

for (const directory of [reportDirectory, resultsDirectory]) {
  mkdirSync(directory, { recursive: true })
}

export default defineConfig({
  testDir: 'tests/browser',
  metadata: { serverMode },
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['line'], ['html', { open: 'never', outputFolder: reportDirectory }]],
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
    stderr: 'pipe',
    stdout: 'pipe',
    timeout: 120_000,
    url: `http://127.0.0.1:${port}/login`,
  },
})
