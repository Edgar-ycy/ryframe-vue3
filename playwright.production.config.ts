import { defineConfig, devices } from '@playwright/test'
import { loadEnv } from 'vite'

const isCi = Boolean(process.env.CI)
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH
const environment = loadEnv('production-smoke', process.cwd(), '')
const configuredOrigin = environment.VITE_APP_API_ORIGIN

if (!configuredOrigin) {
  throw new Error('生产构建烟测缺少 VITE_APP_API_ORIGIN')
}

const productionUrl = new URL(configuredOrigin)
const productionPort = Number(productionUrl.port)

if (
  productionUrl.protocol !== 'http:'
  || productionUrl.hostname !== '127.0.0.1'
  || productionUrl.username
  || productionUrl.password
  || productionUrl.pathname !== '/'
  || productionUrl.search
  || productionUrl.hash
  || !Number.isInteger(productionPort)
  || productionPort < 1
  || productionPort > 65535
) {
  throw new Error('生产构建烟测必须使用带端口的本机 HTTP origin')
}

const productionOrigin = productionUrl.origin

export default defineConfig({
  testDir: './tests/e2e-production',
  outputDir: 'test-results/production',
  fullyParallel: false,
  forbidOnly: isCi,
  retries: 0,
  workers: 1,
  reporter: isCi ? 'line' : 'list',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: productionOrigin,
    headless: true,
    locale: 'zh-CN',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  webServer: {
    command: `pnpm preview --host ${productionUrl.hostname} --port ${productionPort} --strictPort`,
    url: productionOrigin,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  projects: [
    {
      name: 'chromium-production',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
