import { defineConfig, type ReporterDescription } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateRealBrowserEnvironment } from './scripts/real-browser-environment.mjs'
import { verifyBuildReceipt } from './scripts/restore-build.mjs'
import { realTestSelection } from './scripts/restore-scenarios.mjs'

const environment = validateRealBrowserEnvironment()
const { fixture, port, runId, serverMode } = environment
const externalBaseUrl = environment.baseURL
if (serverMode === 'preview' && !externalBaseUrl) {
  verifyBuildReceipt(fileURLToPath(new URL('.', import.meta.url)))
}
const restore = realTestSelection(process.env.RYFRAME_RESTORE_BINDINGS, fixture)
const baseURL = externalBaseUrl || `http://127.0.0.1:${port}`
const channel = process.env.PLAYWRIGHT_CHANNEL?.trim() || (process.env.CI ? undefined : 'chrome')
const artifactSuffix = `${fixture}/${serverMode}${runId ? `/${runId}` : ''}`
const reportDirectory = `.local-tests/playwright-real/report/${artifactSuffix}`
const resultsDirectory = `.local-tests/playwright-real/results/${artifactSuffix}`
const reporters: ReporterDescription[] = [
  ['line'],
  ['html', { open: 'never', outputFolder: reportDirectory }],
]
if (restore.reporter)
  reporters.push(['./scripts/restore-reporter.mjs', { expectedBinding: restore.reporter }])

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
  testDir: fixture === 'device' ? 'tests/browser-device' : 'tests/browser-real',
  ...restore.selection,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: reporters,
  outputDir: resultsDirectory,
  use: {
    baseURL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
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
        command: `node scripts/run-real-browser-server.mjs ${serverMode} ${port}`,
        reuseExistingServer: false,
        timeout: 120_000,
        url: `${baseURL}/login`,
      },
})
