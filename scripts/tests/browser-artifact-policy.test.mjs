import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import { runTaskProcess } from '../task-process.mjs'
import { TaskRunControl } from '../task-run-control.mjs'
import { browserProcessLog } from '../task-runner.mjs'
import { taskWorkerProtocol } from '../task-worker-protocol.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const uploadArtifactV4 = 'actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a'
const downloadArtifactV4 = 'actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c'

async function read(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8')
}

async function temporaryDirectory(context) {
  const parent = path.join(root, '.local-tests', 'node-unit')
  await mkdir(parent, { recursive: true })
  const directory = await mkdtemp(path.join(parent, '浏览器日志-'))
  context.after(() => rm(directory, { recursive: true, force: true }))
  return directory
}

test('普通与真实浏览器测试保留完整失败产物', async () => {
  for (const config of ['playwright.config.ts', 'playwright.real.config.ts']) {
    const source = await read(config)
    assert.match(source, /screenshot: 'only-on-failure'/u)
    assert.match(source, /trace: 'retain-on-failure'/u)
    assert.match(source, /video: 'retain-on-failure'/u)
    assert.match(source, /mkdirSync\(directory, \{ recursive: true \}\)/u)
    assert.match(source, /stderr: 'pipe'/u)
    assert.match(source, /stdout: 'pipe'/u)
  }
  const fixture = await read('playwright.config.ts')
  assert.match(fixture, /reporter: \[\['line'\], \['html'/u)
  assert.doesNotMatch(fixture, /reporter: process\.env\.CI/u)
})

test('浏览器任务使用对应结果路径', () => {
  const fixture = browserProcessLog(
    { id: 'browser', params: { fixture: 'core', real: false, server: 'preview' } },
    { RYFRAME_E2E_RUN_ID: 'ignored-fixture-id' },
  )
  assert.equal(
    path.relative(root, fixture),
    path.join('.local-tests', 'playwright', 'results', 'preview', 'browser-web-server.log'),
  )
  const real = browserProcessLog(
    { id: 'browser', params: { fixture: 'device', real: true, server: 'dev' } },
    { RYFRAME_E2E_RUN_ID: 'r25-device-dev' },
  )
  assert.equal(
    path.relative(root, real),
    path.join(
      '.local-tests',
      'playwright-real',
      'results',
      'device',
      'dev',
      'r25-device-dev',
      'browser-web-server.log',
    ),
  )
})

test('真实任务进程收集 stdout 与 stderr，写盘前脱敏凭证', async (context) => {
  const directory = await temporaryDirectory(context)
  const credentials = {
    RYFRAME_LOG_PASSWORD: 'password-value',
    ryframe_log_secret: 'prefix-overlap-value-suffix',
    RYFRAME_LOG_TOKEN: 'overlap-value',
    RYFRAME_LOG_ACCESS_KEY: 'access-key-value',
    RYFRAME_LOG_PRIVATE_KEY: 'private-key-value',
    RYFRAME_LOG_AUTH: 'auth-value',
    RYFRAME_LOG_COOKIE: 'cookie-value',
    RYFRAME_LOG_EMPTY_SECRET: '',
  }
  const source = `const values = Object.entries(process.env)
  .filter(([name]) => name.toUpperCase().startsWith('RYFRAME_LOG_'))
  .map(([, value]) => value)
console.log(values.join('\\n'))
console.log('Authorization: Bearer visible-bearer\\nAuthorization=Basic visible-basic')
console.log('Bearer visible-standalone-bearer%@\\nBasic visible-standalone-basic==')
console.log('Cookie: sid=visible-cookie\\nSet-Cookie: sid=visible-set-cookie; HttpOnly')
console.log('password=visible-password token:visible-token secret="visible-secret"')
console.error('stderr 已捕获')`
  const outputFile = path.join(directory, '含 空格', 'browser-web-server.log')
  const control = new TaskRunControl()
  const result = await runTaskProcess(
    { command: process.execPath, args: ['-e', source] },
    {
      cwd: directory,
      env: { ...process.env, ...credentials },
      interactive: false,
      control,
      outputFile,
    },
  )
  control.dispose()

  assert.equal(result.code, 0)
  assert.match(result.stdout, /visible-bearer/u)
  assert.match(result.stderr, /stderr 已捕获/u)
  const processLog = await readFile(outputFile, 'utf8')
  assert.match(processLog, /\[stdout\][\s\S]*\[REDACTED\]/u)
  assert.match(processLog, /\[stderr\][\s\S]*stderr 已捕获/u)
  assert.match(processLog, /\[REDACTED\]/u)
  const common = [
    'visible-bearer',
    'visible-basic',
    'visible-standalone-bearer%@',
    'visible-standalone-basic==',
    'visible-cookie',
    'visible-set-cookie',
    'visible-password',
    'visible-token',
    'visible-secret',
  ]
  for (const secret of [...Object.values(credentials).filter(Boolean), ...common]) {
    assert.equal(processLog.includes(secret), false)
  }
  assert.doesNotMatch(processLog, /prefix-|-suffix/u)
})

test('日志写入失败使成功任务失败，不覆盖原退出码与信号', async (context) => {
  const directory = await temporaryDirectory(context)
  const invocation = { command: process.execPath, args: ['-e', 'process.exit(0)'] }
  const successControl = new TaskRunControl()
  const writeFailure = await runTaskProcess(invocation, {
    cwd: directory,
    env: process.env,
    interactive: false,
    control: successControl,
    outputFile: directory,
  })
  assert.equal(writeFailure.code, 1)
  assert.match(writeFailure.error.message, /无法保存任务进程日志/u)
  assert.equal(successControl.exitCode, 1)
  successControl.dispose()

  const child = Object.assign(new EventEmitter(), {
    exitCode: null,
    pid: undefined,
    signalCode: null,
    stderr: new PassThrough(),
    stdout: new PassThrough(),
  })
  const failureControl = new TaskRunControl()
  const running = runTaskProcess(
    {},
    {
      control: failureControl,
      interactive: false,
      outputFile: directory,
      spawnChild: () => child,
    },
  )
  if (process.platform === 'win32') {
    child.emit('message', { type: taskWorkerProtocol.result, code: 17, signal: 'SIGTERM' })
  } else {
    child.exitCode = 17
    child.emit('exit', 17, 'SIGTERM')
  }
  child.emit('close', process.platform === 'win32' ? 0 : 17, 'SIGTERM')
  const originalFailure = await running
  assert.deepEqual([originalFailure.code, originalFailure.signal], [17, 'SIGTERM'])
  assert.match(originalFailure.error.message, /无法保存任务进程日志/u)
  assert.equal(failureControl.exitCode, 143)
  failureControl.dispose()
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
