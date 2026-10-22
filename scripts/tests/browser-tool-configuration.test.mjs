import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { EventEmitter } from 'node:events'
import test from 'node:test'
import { fixture } from './application-config-fixture.mjs'
import { createBrowserControl, readBrowserControl } from '../browser-control.mjs'
import { runBrowser, parseBrowserArguments } from '../run-browser.mjs'
import { loadSmokeBrowserConfiguration } from '../smoke-browser-configuration.mjs'
import {
  loadRealBrowserEnvironment,
  realBrowserCredentials,
  restorePassword,
} from '../real-browser-environment.mjs'

function configured(t) {
  const selected = fixture(t)
  const input = {
    scopeId: 'browser-tool-unit',
    tenantId: 'system',
    username: 'admin',
    password: 'PRIVATE-SENTINEL',
    backendDir: path.resolve('中文 后端'),
    runtimeDir: path.resolve('中文 运行目录'),
    python: path.resolve('工具/python.exe'),
    requestCapacity: 100,
    requestWindowSeconds: 60,
    loginCapacity: 5,
    loginWindowSeconds: 60,
    loginBudgetState: path.resolve('登录 预算.json'),
    channel: 'chromium',
    runId: 'unit-run',
    restorePasswords: { restored: 'RESTORE-SECRET' },
  }
  fs.mkdirSync(path.join(selected.root, '.local-tests'))
  selected.write('.local-tests/frontend-tools.json', { real_browser: input })
  return { ...selected, input }
}

test('受管文件读取凭据但公开绑定和控制文件均不包含密码', (t) => {
  const { root, input } = configured(t)
  const close = createBrowserControl(root, { real: true, fixture: 'business', server: 'preview' })
  try {
    const binding = loadRealBrowserEnvironment(root)
    assert.equal(binding.serverMode, 'preview')
    assert.equal(binding.fixture, 'business')
    assert.equal(binding.channel, undefined)
    assert.ok(path.isAbsolute(binding.gateEndpoint))
    assert.equal(realBrowserCredentials(root).password, input.password)
    assert.equal(restorePassword('restored', root), 'RESTORE-SECRET')
    assert.throws(() => restorePassword('unknown', root), /密码/u)
    const bytes = fs.readFileSync(path.join(root, '.local-tests/browser-control.json'), 'utf8')
    for (const value of [bytes, JSON.stringify(binding)])
      assert.doesNotMatch(value, /PRIVATE-SENTINEL|RESTORE-SECRET/u)
    assert.throws(() => createBrowserControl(root, { real: true }), /独占/u)
  } finally {
    close()
  }
  assert.equal(readBrowserControl(root), undefined)
})

test('工具文件运行中漂移即失败，未知字段和坏 JSON 不回显凭据', (t) => {
  const { root, write, input } = configured(t)
  const close = createBrowserControl(root, { real: true })
  const file = path.join(root, '.local-tests/frontend-tools.json')
  const original = fs.readFileSync(file)
  write('.local-tests/frontend-tools.json', { real_browser: { ...input, password: 'changed' } })
  assert.throws(() => loadRealBrowserEnvironment(root), /漂移/u)
  fs.writeFileSync(file, original)
  close()
  for (const text of [
    '{"real_browser":{"password":"PRIVATE-SENTINEL",',
    JSON.stringify({ real_browser: { ...input, wrong: 'PRIVATE-SENTINEL' } }),
  ]) {
    fs.writeFileSync(file, text)
    assert.throws(
      () => loadRealBrowserEnvironment(root),
      (error) => !error.message.includes('PRIVATE-SENTINEL'),
    )
  }
})

test('控制文件被替换时保留现场，不清理其他控制器的证据', (t) => {
  const { root } = configured(t)
  const close = createBrowserControl(root, {})
  const file = path.join(root, '.local-tests/browser-control.json')
  fs.writeFileSync(file, '{}')
  assert.throws(close, /发生变化/u)
  assert.equal(fs.readFileSync(file, 'utf8'), '{}')
})

test('smoke 每次分配新代次，CLI 模式使用受管文件传递', (t) => {
  const { root, write } = fixture(t)
  write('config/tools.json', { browser_smoke: { channel: 'chromium', serverMode: 'dev' } })
  const attempts = []
  for (let index = 0; index < 2; index += 1) {
    const close = createBrowserControl(root, { server: 'preview' })
    try {
      const config = loadSmokeBrowserConfiguration(root)
      assert.equal(config.serverMode, 'preview')
      assert.equal(config.channel, undefined)
      assert.equal(config.attempt, loadSmokeBrowserConfiguration(root).attempt)
      attempts.push(config.attempt)
    } finally {
      close()
    }
  }
  assert.notEqual(attempts[0], attempts[1])
})

test('外部代理保留显式 IPC 绑定；无效配置在假进程启动前失败并清理控制文件', async (t) => {
  const { root, write, input } = configured(t)
  const gateEndpoint =
    process.platform === 'win32' ? '\\\\.\\pipe\\external-unit' : '/tmp/external-unit.sock'
  write('.local-tests/frontend-tools.json', {
    real_browser: { ...input, baseURL: 'http://127.0.0.1:49152', gateEndpoint },
  })
  const close = createBrowserControl(root, { real: true })
  try {
    assert.equal(loadRealBrowserEnvironment(root).gateEndpoint, gateEndpoint)
  } finally {
    close()
  }
  write('.local-tests/frontend-tools.json', { real_browser: { ...input, password: '' } })
  await assert.rejects(
    runBrowser({ real: true }, root, () => assert.fail('无效配置不得启动进程')),
    /password/u,
  )
  assert.equal(readBrowserControl(root), undefined)
})

test('运行器保留失败语义和清理，使用假进程不启动浏览器或服务', async (t) => {
  const { root } = configured(t)
  for (const status of [0, 9]) {
    const running = runBrowser(parseBrowserArguments(['--real']), root, (command, argv) => {
      assert.ok(command)
      assert.ok(argv.includes('playwright.real.config.ts'))
      assert.ok(readBrowserControl(root))
      const child = new EventEmitter()
      queueMicrotask(() => child.emit('exit', status, null))
      return child
    })
    if (status) await assert.rejects(running, /9/u)
    else await running
    assert.equal(readBrowserControl(root), undefined)
  }
  for (const argv of [
    ['--fixture', 'core'],
    ['--real', '--real'],
    ['--server', 'bad'],
    ['--real', '--fixture', 'core', '--fixture', 'business'],
  ])
    assert.throws(() => parseBrowserArguments(argv))
})
