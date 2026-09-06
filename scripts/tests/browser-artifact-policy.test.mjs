import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const uploadArtifactV4 = 'actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a'
const downloadArtifactV4 = 'actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c'

async function read(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8')
}

test('普通与真实浏览器测试保留完整失败产物', async () => {
  for (const config of ['playwright.config.ts', 'playwright.real.config.ts']) {
    const source = await read(config)
    assert.match(source, /screenshot: 'only-on-failure'/u)
    assert.match(source, /trace: 'retain-on-failure'/u)
    assert.match(source, /video: 'retain-on-failure'/u)
    assert.match(source, /mkdirSync\(directory, \{ recursive: true \}\)/u)
  }
})

test('普通浏览器门禁严格上传报告与测试结果', async () => {
  const workflow = await read('.github/workflows/ci.yml')
  const browser = workflow.split('\n  browser:\n', 2)[1].split('\n  windows-smoke:\n', 1)[0]

  assert.match(browser, /if: \$\{\{ always\(\) \}\}/u)
  assert.match(browser, /\.local-tests\/playwright\/report/u)
  assert.match(browser, /\.local-tests\/playwright\/results/u)
  assert.match(browser, /if-no-files-found: error/u)
  assert.doesNotMatch(browser, /if-no-files-found: (?:ignore|warn)/u)
})

test('静态检查忽略浏览器和覆盖率生成物', async () => {
  const eslint = await read('eslint.config.js')
  for (const generated of [
    '.local-tests/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
  ]) {
    assert.match(eslint, new RegExp(`['"]${generated.replaceAll('*', '\\*')}['"]`, 'u'))
  }
})

test('浏览器复用同一 SHA 与 attempt 的构建，同时验收 dev 和 preview', async () => {
  const { jobs } = parse(await read('.github/workflows/ci.yml'))
  const upload = jobs.build.steps.find((step) => step.uses?.startsWith('actions/upload-artifact@'))
  const download = jobs.browser.steps.find((step) =>
    step.uses?.startsWith('actions/download-artifact@'),
  )
  const build = jobs.build.steps.find((step) => step.run === 'corepack pnpm build --real')
  assert.ok(build)
  assert.equal(build.env.VITE_APP_BUILD_COMMIT, '${{ github.sha }}')
  assert.equal(jobs.browser.needs, 'build')
  assert.equal(upload.uses, uploadArtifactV4)
  assert.equal(download.uses, downloadArtifactV4)
  assert.equal(upload.with.name, 'frontend-production-${{ github.sha }}-${{ github.run_attempt }}')
  assert.equal(download.with.name, upload.with.name)
  assert.equal(upload.with.path, 'dist')
  assert.equal(download.with.path, 'dist')
  assert.equal(upload.with['include-hidden-files'], true)
  assert.equal(upload.with['if-no-files-found'], 'error')

  const devCommand = 'corepack pnpm check --stage browser --fixture core --server dev'
  const previewCommand = 'corepack pnpm check --stage browser --fixture core --server preview'
  const devIndex = jobs.browser.steps.findIndex((step) => step.run === devCommand)
  const downloadIndex = jobs.browser.steps.indexOf(download)
  const previewIndex = jobs.browser.steps.findIndex((step) => step.run === previewCommand)
  assert.ok(devIndex >= 0 && devIndex < downloadIndex)
  assert.ok(downloadIndex < previewIndex)
  for (const index of [devIndex, previewIndex]) {
    assert.equal(jobs.browser.steps[index].if, undefined)
    assert.equal(jobs.browser.steps[index]['continue-on-error'], undefined)
  }

  const failureUpload = jobs.browser.steps.find(
    (step) => step.name === 'Upload browser failure artifacts',
  )
  assert.equal(failureUpload.if, '${{ always() }}')
  assert.equal(failureUpload.with.name, 'browser-smoke-${{ github.sha }}-${{ github.run_attempt }}')
  assert.equal(failureUpload.with['include-hidden-files'], true)
  assert.equal(failureUpload.with['if-no-files-found'], 'error')

  const playwright = await read('playwright.config.ts')
  const vite = await read('vite.config.ts')
  assert.match(playwright, /serverMode === 'preview'/u)
  assert.match(playwright, /run-browser-preview-harness-server\.mjs/u)
  assert.match(playwright, /node_modules\/vite\/bin\/vite\.js/u)
  await read('scripts/run-browser-preview-harness-server.mjs')
  assert.doesNotMatch(playwright, /vite(?:\.js)? build/u)
  assert.match(vite, /outDir: 'dist'/u)
})
