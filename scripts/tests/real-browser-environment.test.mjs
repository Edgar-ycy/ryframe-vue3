import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import test from 'node:test'
import { validateRealBrowserEnvironment } from '../real-browser-environment.mjs'

function validEnvironment() {
  return {
    python: resolve('工具', 'python.exe'),
    scopeId: 'real-browser-unit',
    tenantId: 'system',
    username: 'admin',
    password: 'not-recorded',
    workerTool: {
      root: resolve('D 盘源码', '工具 N'),
      binding: {
        path: resolve('D 盘源码', '工具 N', '.local-tests/frontend-origin-tool.json'),
        bytes: 256,
        sha256: 'a'.repeat(64),
      },
    },
    backendDir: resolve('D 盘源码', '后端 O'),
    runtimeDir: resolve('D 盘运行', '当前'),
    requestCapacity: 100,
    requestWindowSeconds: 60,
    loginCapacity: 5,
    loginWindowSeconds: 60,
    loginBudgetState: resolve('D 盘运行', '登录 预算.json'),
    baseURL: 'http://127.0.0.1:4174',
  }
}

test('登记环境完整时返回脱敏绑定，并保留中文空格绝对路径', () => {
  const environment = validEnvironment()
  const binding = validateRealBrowserEnvironment(environment)
  assert.equal(binding.scopeId, 'real-browser-unit')
  assert.equal(binding.backendDir, environment.backendDir)
  assert.deepEqual(binding.workerTool, environment.workerTool)
  assert.notEqual(binding.workerTool.root, binding.backendDir)
  assert.equal(Object.isFrozen(binding.workerTool), true)
  assert.equal(Object.isFrozen(binding.workerTool.binding), true)
  assert.equal(binding.loginBudgetState, environment.loginBudgetState)
  assert.equal(binding.baseURL, 'http://127.0.0.1:4174')
  assert.equal(binding.port, 4174)
  assert.equal(binding.serverMode, 'dev')
  assert.equal(binding.fixture, 'core')
  assert.equal(binding.runId, undefined)
  assert.equal(binding.restore, undefined)
  assert.equal(JSON.stringify(binding).includes(environment.password), false)
  assert.equal(Object.isFrozen(binding), true)
})

test('恢复环境成组绑定 target plan、运行收据、协调器与当前 runner', () => {
  const environment = {
    ...validEnvironment(),
    restore: {
      bindings: resolve('D 盘证据', 'bindings.json'),
      runtimeReceipt: resolve('D 盘证据', 'runtime.json'),
      targetPlan: resolve('D 盘证据', 'target-plan.json'),
      coordinatorDir: resolve('D 盘源码', '协调器'),
      coordinatorSha: 'c'.repeat(40),
      verifierDir: validEnvironment().workerTool.root,
      verifierSha: 'b'.repeat(40),
      runnerSha: 'a'.repeat(40),
    },
  }
  assert.deepEqual(validateRealBrowserEnvironment(environment).restore, {
    bindings: environment.restore.bindings,
    runtimeReceipt: environment.restore.runtimeReceipt,
    targetPlan: environment.restore.targetPlan,
    coordinatorDir: environment.restore.coordinatorDir,
    coordinatorSha: environment.restore.coordinatorSha,
    verifierDir: environment.restore.verifierDir,
    verifierSha: environment.restore.verifierSha,
    runnerSha: environment.restore.runnerSha,
  })
})

test('普通真实浏览器可单独固定 Python 而不会误启用恢复流程', () => {
  const environment = { ...validEnvironment(), python: resolve('python.exe') }
  const binding = validateRealBrowserEnvironment(environment)
  assert.equal(binding.python, environment.python)
  assert.equal(binding.restore, undefined)
})

test('恢复环境拒绝缺项、相对路径、非完整 SHA 和已退休的嵌套字段', () => {
  const base = validEnvironment()
  assert.throws(
    () => validateRealBrowserEnvironment({ ...base, restore: { bindings: resolve('x') } }),
    /同时登记/u,
  )
  const complete = {
    ...base,
    restore: {
      bindings: resolve('bindings.json'),
      runtimeReceipt: resolve('runtime.json'),
      targetPlan: resolve('target-plan.json'),
      coordinatorDir: resolve('backend'),
      coordinatorSha: 'c'.repeat(40),
      verifierDir: base.workerTool.root,
      verifierSha: 'b'.repeat(40),
      runnerSha: 'a'.repeat(40),
    },
  }
  assert.throws(() =>
    validateRealBrowserEnvironment({
      ...complete,
      restore: { ...complete.restore, targetPlan: 'target.json' },
    }),
  )
  assert.throws(() =>
    validateRealBrowserEnvironment({
      ...complete,
      restore: { ...complete.restore, runnerSha: 'a'.repeat(39) },
    }),
  )
  assert.throws(() =>
    validateRealBrowserEnvironment({
      ...complete,
      restore: { ...complete.restore, verifierSha: 'B'.repeat(40) },
    }),
  )
  assert.throws(
    () =>
      validateRealBrowserEnvironment({
        ...complete,
        restore: { ...complete.restore, python: resolve('D 盘工具', 'python.exe') },
      }),
    /real_browser\.restore字段无效/u,
  )
})

test('运行选项经过统一校验并保留显式选择', () => {
  const binding = validateRealBrowserEnvironment({
    ...validEnvironment(),
    password: undefined,
    credentialEndpoint: 'http://127.0.0.1:49152/v1/credentials',
    port: 49152,
    serverMode: 'preview',
    fixture: 'business',
    runId: 'attempt-12',
  })
  assert.deepEqual(
    {
      port: binding.port,
      serverMode: binding.serverMode,
      fixture: binding.fixture,
      runId: binding.runId,
    },
    { port: 49152, serverMode: 'preview', fixture: 'business', runId: 'attempt-12' },
  )
})

test('非法运行选项在创建产物和服务前失败', () => {
  for (const [name, value] of [
    ['port', 0],
    ['port', 65536],
    ['serverMode', 'production'],
    ['fixture', 'unknown'],
    ['runId', 'UPPER'],
    ['runId', `a${'-a'.repeat(32)}`],
  ]) {
    assert.throws(() => validateRealBrowserEnvironment({ ...validEnvironment(), [name]: value }))
  }
  assert.throws(
    () =>
      validateRealBrowserEnvironment({
        ...validEnvironment(),
        password: undefined,
        credentialEndpoint: 'http://127.0.0.1:49152/v1/credentials',
        fixture: 'business',
      }),
    /业务.*runId/u,
  )
})

test('任一登记、凭据引用、限流来源或账本路径缺失都会失败', () => {
  for (const name of Object.keys(validEnvironment())) {
    if (name === 'baseURL') continue
    const environment = validEnvironment()
    delete environment[name]
    assert.throws(() => validateRealBrowserEnvironment(environment), /真实|缺少|必须/u, name)
  }
})

test('配置失真时不使用默认值或自动修正', () => {
  for (const [name, value] of [
    ['scopeId', 'UPPER'],
    ['requestCapacity', 0],
    ['requestWindowSeconds', '1.5'],
    ['loginCapacity', 10001],
    ['loginBudgetState', 'relative/budget.json'],
    ['backendDir', `${resolve('backend')}\nother`],
  ]) {
    assert.throws(() => validateRealBrowserEnvironment({ ...validEnvironment(), [name]: value }))
  }
})

test('资源 scope 与产品合同保持相同边界', () => {
  for (const value of ['a1', `a${'_'.repeat(46)}z`, 'dev_local-01']) {
    assert.equal(
      validateRealBrowserEnvironment({ ...validEnvironment(), scopeId: value }).scopeId,
      value,
    )
  }
  for (const value of [
    'a',
    `a${'_'.repeat(47)}z`,
    'Upper',
    'scope.dot',
    '-scope',
    'scope-',
    '_scope',
    'scope_',
  ]) {
    assert.throws(() => validateRealBrowserEnvironment({ ...validEnvironment(), scopeId: value }))
  }
})

test('外部服务只允许带明确端口的本机 HTTP 原点', () => {
  for (const value of [
    'https://127.0.0.1:4174',
    'http://example.com:4174',
    'http://user@127.0.0.1:4174',
    'http://127.0.0.1:4174/path',
    'http://127.0.0.1',
  ]) {
    assert.throws(() => validateRealBrowserEnvironment({ ...validEnvironment(), baseURL: value }))
  }
})

test('Worker 双来源配置必须完整且固定位置、大小、摘要严格，不回退业务后端', () => {
  const base = validEnvironment()
  const tool = base.workerTool
  for (const workerTool of [
    undefined,
    null,
    {},
    { ...tool, private: 'PRIVATE-SENTINEL' },
    { ...tool, root: 'relative' },
    { ...tool, binding: undefined },
    { ...tool, binding: { ...tool.binding, path: resolve('other.json') } },
    { ...tool, binding: { ...tool.binding, extra: true } },
    ...[0, true, '256', 1.5, 4 * 1024 * 1024 + 1].map((bytes) => ({
      ...tool,
      binding: { ...tool.binding, bytes },
    })),
    ...['A'.repeat(64), 'a'.repeat(63), 'PRIVATE-SENTINEL'].map((sha256) => ({
      ...tool,
      binding: { ...tool.binding, sha256 },
    })),
  ]) {
    assert.throws(
      () => validateRealBrowserEnvironment({ ...base, workerTool }),
      (error) => !error.message.includes('PRIVATE-SENTINEL'),
    )
  }
})

test('恢复环境拒绝不规范的独立来源和错绑 Worker 来源根', () => {
  const base = validEnvironment()
  const restore = {
    bindings: resolve('bindings.json'),
    runtimeReceipt: resolve('runtime.json'),
    targetPlan: resolve('target.json'),
    coordinatorDir: resolve('coordinator'),
    coordinatorSha: 'c'.repeat(40),
    verifierDir: base.workerTool.root,
    verifierSha: 'b'.repeat(40),
    runnerSha: 'a'.repeat(40),
  }
  for (const change of [
    { coordinatorSha: 'C'.repeat(40) },
    { coordinatorDir: `${restore.coordinatorDir}/../coordinator` },
    { verifierDir: `${restore.verifierDir}/.` },
    { verifierDir: restore.coordinatorDir },
  ])
    assert.throws(() =>
      validateRealBrowserEnvironment({ ...base, restore: { ...restore, ...change } }),
    )
})
