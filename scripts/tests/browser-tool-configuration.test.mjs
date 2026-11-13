import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { EventEmitter } from 'node:events'
import test from 'node:test'
import { fixture } from './application-config-fixture.mjs'
import { createBrowserControl, readBrowserControl } from '../browser-control.mjs'
import { realBrowserArtifactDirectories } from '../real-browser-artifacts.mjs'
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
    credentialEndpoint: 'http://127.0.0.1:49152/v1/credentials',
    workerTool: {
      root: path.resolve('中文 工具来源 N'),
      binding: {
        path: path.resolve('中文 工具来源 N', '.local-tests/frontend-origin-tool.json'),
        bytes: 256,
        sha256: 'a'.repeat(64),
      },
    },
    backendDir: path.resolve('中文 业务后端 O'),
    runtimeDir: path.resolve('中文 运行目录'),
    requestCapacity: 100,
    requestWindowSeconds: 60,
    loginCapacity: 5,
    loginWindowSeconds: 60,
    loginBudgetState: path.resolve('登录 预算.json'),
    channel: 'chromium',
    fixture: 'business',
    runId: 'unit-run',
  }
  fs.mkdirSync(path.join(selected.root, '.local-tests'))
  selected.write('.local-tests/frontend-tools.json', { real_browser: input })
  return { ...selected, input }
}

test('业务凭据由受管代理读取且公开绑定和控制文件均不包含密码', (t) => {
  const { root, input } = configured(t)
  const close = createBrowserControl(root, { real: true, fixture: 'business', server: 'preview' })
  try {
    const binding = loadRealBrowserEnvironment(root)
    assert.deepEqual(binding.workerTool, input.workerTool)
    assert.notEqual(binding.workerTool.root, binding.backendDir)
    assert.equal(binding.serverMode, 'preview')
    assert.equal(binding.fixture, 'business')
    assert.equal(binding.channel, undefined)
    assert.ok(path.isAbsolute(binding.gateEndpoint))
    const execute = (_command, argv, options) => {
      assert.equal(argv.at(-1), input.credentialEndpoint)
      assert.equal(options.encoding, 'utf8')
      return '{"password":"PRIVATE-SENTINEL"}'
    }
    assert.equal(realBrowserCredentials(root, execute).password, 'PRIVATE-SENTINEL')
    const bytes = fs.readFileSync(path.join(root, '.local-tests/browser-control.json'), 'utf8')
    for (const value of [bytes, JSON.stringify(binding)])
      assert.doesNotMatch(value, /PRIVATE-SENTINEL/u)
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
  write('.local-tests/frontend-tools.json', {
    real_browser: { ...input, credentialEndpoint: 'http://127.0.0.1:49153/v1/credentials' },
  })
  assert.throws(() => loadRealBrowserEnvironment(root), /漂移/u)
  fs.writeFileSync(file, original)
  close()
  for (const text of [
    '{"real_browser":{"credentialEndpoint":"PRIVATE-SENTINEL",',
    JSON.stringify({ real_browser: { ...input, wrong: 'PRIVATE-SENTINEL' } }),
    JSON.stringify({ real_browser: { ...input, python: 'PRIVATE-SENTINEL' } }),
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
    /凭据/u,
  )
  assert.equal(readBrowserControl(root), undefined)
})

test('普通真实浏览器仍从本机工具配置读取显式凭据', (t) => {
  const { root, write, input } = configured(t)
  write('.local-tests/frontend-tools.json', {
    real_browser: {
      ...input,
      fixture: 'core',
      runId: undefined,
      credentialEndpoint: undefined,
      password: 'CORE-PRIVATE',
      restorePasswords: { restored: 'RESTORE-SECRET' },
    },
  })
  assert.equal(realBrowserCredentials(root).password, 'CORE-PRIVATE')
  assert.equal(restorePassword('restored', root), 'RESTORE-SECRET')
  assert.throws(() => restorePassword('unknown', root), /密码/u)
})

test('受管 core 复验按控制器代次保存报告与结果，保留原产物', async (t) => {
  const { root, write, input } = configured(t)
  write('.local-tests/frontend-tools.json', {
    real_browser: {
      ...input,
      fixture: 'core',
      runId: undefined,
      credentialEndpoint: undefined,
      password: 'CORE-PRIVATE',
    },
  })
  const options = parseBrowserArguments(['--real', '--fixture', 'core', '--server', 'dev'])
  const attempts = []
  for (const sentinel of ['first', 'second']) {
    await runBrowser(options, root, (_command, argv) => {
      assert.ok(argv.includes('playwright.real.config.ts'))
      const { attempt } = readBrowserControl(root)
      const binding = loadRealBrowserEnvironment(root)
      assert.equal(binding.runId, undefined)
      const directories = realBrowserArtifactDirectories(root, binding)
      assert.deepEqual(directories, {
        reportDirectory: `.local-tests/playwright-real/report/core/dev/${attempt}`,
        resultsDirectory: `.local-tests/playwright-real/results/core/dev/${attempt}`,
      })
      for (const directory of Object.values(directories)) {
        fs.mkdirSync(path.join(root, directory), { recursive: true })
        fs.writeFileSync(path.join(root, directory, 'sentinel'), sentinel, { flag: 'wx' })
      }
      attempts.push(directories)
      const child = new EventEmitter()
      queueMicrotask(() => child.emit('exit', 0, null))
      return child
    })
    assert.equal(readBrowserControl(root), undefined)
  }
  assert.notEqual(attempts[0].reportDirectory, attempts[1].reportDirectory)
  assert.notEqual(attempts[0].resultsDirectory, attempts[1].resultsDirectory)
  for (const directory of Object.values(attempts[0]))
    assert.equal(fs.readFileSync(path.join(root, directory, 'sentinel'), 'utf8'), 'first')
  const binding = loadRealBrowserEnvironment(root)
  const direct = realBrowserArtifactDirectories(root, binding)
  assert.match(direct.reportDirectory, /\/core\/dev\/[a-f0-9-]{36}$/u)
  assert.notEqual(
    direct.reportDirectory,
    realBrowserArtifactDirectories(root, binding).reportDirectory,
  )
})

test('显式 runId 的已有产物和产物路径上的链接在 Playwright 启动前拒绝', async (t) => {
  for (const location of ['report', 'results', 'link', 'ancestor']) {
    const { root, write, input } = configured(t)
    write('.local-tests/frontend-tools.json', {
      real_browser: {
        ...input,
        fixture: 'core',
        credentialEndpoint: undefined,
        password: 'CORE-PRIVATE',
      },
    })
    const ancestor = location === 'ancestor'
    const isLink = location === 'link' || ancestor
    const kind = isLink ? 'results' : location
    const relative = `.local-tests/playwright-real/${kind}/core/dev/${input.runId}`
    const destination = path.join(root, relative)
    const link = ancestor ? path.dirname(destination) : destination
    const target = path.join(root, 'artifact-link-target')
    if (isLink) {
      if (ancestor) {
        fs.mkdirSync(target)
        fs.writeFileSync(path.join(target, 'sentinel'), location)
      }
      fs.mkdirSync(path.dirname(link), { recursive: true })
      fs.symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir')
    } else {
      fs.mkdirSync(destination, { recursive: true })
      fs.writeFileSync(path.join(destination, 'sentinel'), location)
    }
    await assert.rejects(
      runBrowser(parseBrowserArguments(['--real']), root, () =>
        assert.fail('存在产物或链接时不得启动 Playwright'),
      ),
      ancestor
        ? /真实浏览器产物目录.*(?:链接|重解析)/u
        : (error) => error.message.includes(`真实浏览器产物目录已存在：${relative}`),
    )
    assert.equal(readBrowserControl(root), undefined)
    if (isLink) assert.ok(fs.lstatSync(link).isSymbolicLink())
    else assert.equal(fs.readFileSync(path.join(destination, 'sentinel'), 'utf8'), location)
    if (ancestor) {
      assert.deepEqual(fs.readdirSync(target), ['sentinel'])
      assert.equal(fs.readFileSync(path.join(target, 'sentinel'), 'utf8'), location)
    }
  }
})

test('运行器保留失败语义和清理，使用假进程不启动浏览器或服务', async (t) => {
  const { root } = configured(t)
  for (const status of [0, 9]) {
    const running = runBrowser(
      parseBrowserArguments(['--real', '--server', 'preview']),
      root,
      (command, argv) => {
        assert.ok(command)
        assert.ok(argv.includes('playwright.real.config.ts'))
        assert.ok(readBrowserControl(root))
        assert.deepEqual(realBrowserArtifactDirectories(root, loadRealBrowserEnvironment(root)), {
          reportDirectory: '.local-tests/playwright-real/report/business/preview/unit-run',
          resultsDirectory: '.local-tests/playwright-real/results/business/preview/unit-run',
        })
        const child = new EventEmitter()
        queueMicrotask(() => child.emit('exit', status, null))
        return child
      },
    )
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

test('生成页面运行器独占执行专用 config，拒绝恢复和业务凭据且不留下控制文件', async (t) => {
  const { root, write, input } = configured(t)
  const core = {
    ...input,
    fixture: 'core',
    runId: undefined,
    credentialEndpoint: undefined,
    password: 'CORE-PRIVATE',
  }
  const options = parseBrowserArguments(['--real', '--fixture', 'core', '--generated'])
  for (const invalid of [
    input,
    { ...core, restore: {} },
    { ...core, credentialEndpoint: input.credentialEndpoint },
  ]) {
    write('.local-tests/frontend-tools.json', { real_browser: invalid })
    await assert.rejects(runBrowser(options, root, () => assert.fail('非法组合不得启动进程')))
    assert.equal(fs.existsSync(path.join(root, '.local-tests/browser-control.json')), false)
  }
  for (const invalid of [{ spec: 'catalog.spec.ts' }, { ...options, spec: '../catalog.spec.ts' }]) {
    await assert.rejects(
      runBrowser(invalid, root, () => assert.fail('非法选择不得启动进程')),
      /spec/u,
    )
    assert.equal(readBrowserControl(root), undefined)
  }
  write('.local-tests/frontend-tools.json', { real_browser: core })
  for (const spec of [undefined, 'generated-catalog-page.spec.ts']) {
    for (const status of [0, 9]) {
      const running = runBrowser(
        { ...options, ...(spec ? { spec } : {}) },
        root,
        (_command, argv) => {
          assert.equal(argv[argv.indexOf('--config') + 1], 'playwright.generated.config.ts')
          assert.deepEqual(argv.slice(argv.indexOf('playwright')), [
            'playwright',
            'test',
            '--config',
            'playwright.generated.config.ts',
            ...(spec
              ? [
                  String.raw`(?:^|[/\\])tests[/\\]browser-generated[/\\]generated-catalog-page\.spec\.ts$`,
                ]
              : []),
          ])
          if (spec) {
            const filter = new RegExp(argv.at(-1))
            for (const target of [
              `tests/browser-generated/${spec}`,
              `/workspace/tests/browser-generated/${spec}`,
              String.raw`D:\workspace\tests\browser-generated\generated-catalog-page.spec.ts`,
            ])
              assert.match(target, filter)
            for (const other of [
              `tests/browser-generated/${spec}.backup`,
              `tests/browser-generated/nested/${spec}`,
              String.raw`D:\workspace\tests\browser-generated\nested\generated-catalog-page.spec.ts`,
              'tests/browser-generated/generated-catalog-pageXspecYts',
              `other-tests/browser-generated/${spec}`,
            ])
              assert.doesNotMatch(other, filter)
          }
          const control = readBrowserControl(root)
          const binding = loadRealBrowserEnvironment(root)
          assert.equal(control.overrides.fixture, 'core')
          assert.equal(binding.runId, undefined)
          assert.equal(
            realBrowserArtifactDirectories(root, binding).resultsDirectory,
            `.local-tests/playwright-real/results/core/dev/${control.attempt}`,
          )
          const child = new EventEmitter()
          queueMicrotask(() => child.emit('exit', status, null))
          return child
        },
      )
      if (status) await assert.rejects(running, /9/u)
      else await running
      assert.equal(readBrowserControl(root), undefined)
    }
  }
  for (const args of [
    ['--spec', 'catalog.spec.ts'],
    ['--real', '--spec', 'catalog.spec.ts'],
    ['--real', '--generated', '--spec'],
    ['--real', '--generated', '--spec', '--real'],
    ['--real', '--generated', '--spec', 'catalog.spec.ts', '--spec', 'catalog.spec.ts'],
    ...[
      '',
      '..',
      '../catalog.spec.ts',
      'sub/catalog.spec.ts',
      'sub\\catalog.spec.ts',
      'catalog.ts',
    ].map((spec) => ['--real', '--generated', '--spec', spec]),
    ['--generated'],
    ['--real', '--generated', '--fixture', 'business'],
    ['--real', '--generated', '--generated'],
  ])
    assert.throws(() => parseBrowserArguments(args))
})
