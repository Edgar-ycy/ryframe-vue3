import { defineConfig, type ReporterDescription } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { realBrowserArtifactDirectories } from './scripts/real-browser-artifacts.mjs'
import { loadRealBrowserEnvironment } from './scripts/real-browser-environment.mjs'
import { verifyBuildReceipt } from './scripts/restore-build.mjs'
import { realTestSelection } from './scripts/restore-scenarios.mjs'
import { bindWorkerTool } from './scripts/worker-tool.mjs'

const root = process.cwd()
export const environment = loadRealBrowserEnvironment(root)
const { fixture, port, runId, serverMode } = environment
const externalBaseUrl = environment.baseURL
const baseURL = externalBaseUrl || `http://127.0.0.1:${port}`
if (serverMode === 'preview' && !externalBaseUrl) {
  verifyBuildReceipt(fileURLToPath(new URL('.', import.meta.url)))
}
const restore = realTestSelection(
  environment.restore,
  fixture,
  baseURL,
  environment.restore ? bindWorkerTool(environment.workerTool) : undefined,
)
const channel = environment.channel
const { reportDirectory, resultsDirectory } = realBrowserArtifactDirectories(root, environment)
const reporters: ReporterDescription[] = [
  ['line'],
  ['html', { open: 'never', outputFolder: reportDirectory }],
]
if (restore.reporter)
  reporters.push([
    './scripts/restore-reporter.mjs',
    { expectedRestore: restore.reporter, browserBinding: environment },
  ])
if (fixture === 'business')
  reporters.push([
    './scripts/business-reporter.mjs',
    {
      output: `${resultsDirectory}/business-tests.json`,
      server: serverMode,
      runId,
    },
  ])

for (const directory of [reportDirectory, resultsDirectory]) {
  mkdirSync(directory, { recursive: true })
}

export default defineConfig({
  testDir: fixture === 'business' ? 'tests/browser-business' : 'tests/browser-real',
  ...restore.selection,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: reporters,
  outputDir: resultsDirectory,
  metadata: restore.worker ? { restoreDatasetAuthority: restore.worker } : {},
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
        stderr: 'pipe',
        stdout: 'pipe',
        timeout: 120_000,
        url: `${baseURL}/login`,
      },
})
