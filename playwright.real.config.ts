import { defineConfig } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { validateRealBrowserEnvironment } from './scripts/real-browser-environment.mjs'

function readPort(): number {
  const port = Number(process.env.RYFRAME_E2E_FRONTEND_PORT?.trim() || '4174')
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('RYFRAME_E2E_FRONTEND_PORT 必须是 1 到 65535 之间的整数')
  }
  return port
}

function readServerMode(): 'dev' | 'preview' {
  const mode = process.env.RYFRAME_E2E_SERVER?.trim() || 'dev'
  if (mode !== 'dev' && mode !== 'preview') {
    throw new Error('RYFRAME_E2E_SERVER 必须为 dev 或 preview')
  }
  return mode
}

const port = readPort()
const serverMode = readServerMode()
validateRealBrowserEnvironment()
const externalBaseUrl = process.env.RYFRAME_E2E_BASE_URL?.trim()
const baseURL = externalBaseUrl || `http://127.0.0.1:${port}`
const channel = process.env.PLAYWRIGHT_CHANNEL?.trim() || (process.env.CI ? undefined : 'chrome')
const reportDirectory = `.local-tests/playwright-real/report/${serverMode}`
const resultsDirectory = `.local-tests/playwright-real/results/${serverMode}`
const serverCommand = `node scripts/run-real-browser-server.mjs ${serverMode} ${port}`

for (const directory of [reportDirectory, resultsDirectory]) {
  mkdirSync(directory, { recursive: true })
}
if (!externalBaseUrl) {
  const controlId = `ryframe-browser-${process.pid}-${randomUUID().slice(0, 8)}`
  process.env.RYFRAME_E2E_GATE_ENDPOINT ||=
    process.platform === 'win32'
      ? `\\\\.\\pipe\\${controlId}`
      : resolve(process.env.RUNNER_TEMP || '.local-tests', `${controlId}.sock`)
}

export default defineConfig({
  testDir: 'tests/browser-real',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['line'], ['html', { open: 'never', outputFolder: reportDirectory }]],
  outputDir: resultsDirectory,
  use: {
    baseURL,
    ...(channel ? { channel } : {}),
    browserName: 'chromium',
    serviceWorkers: 'block',
    locale: 'zh-CN',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: externalBaseUrl
    ? undefined
    : {
        command: serverCommand,
        reuseExistingServer: false,
        timeout: 120_000,
        url: `${baseURL}/login`,
      },
})
