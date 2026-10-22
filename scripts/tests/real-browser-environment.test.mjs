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
    backendDir: resolve('D 盘源码', '后端'),
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
      verifierSha: 'b'.repeat(40),
      runnerSha: 'a'.repeat(40),
      python: resolve('D 盘工具', 'python.exe'),
    },
  }
  assert.deepEqual(validateRealBrowserEnvironment(environment).restore, {
    bindings: environment.restore.bindings,
    runtimeReceipt: environment.restore.runtimeReceipt,
    targetPlan: environment.restore.targetPlan,
    coordinatorDir: environment.restore.coordinatorDir,
    verifierSha: environment.restore.verifierSha,
    runnerSha: environment.restore.runnerSha,
    python: environment.restore.python,
  })
})

test('普通真实浏览器可单独固定 Python 而不会误启用恢复流程', () => {
  const environment = { ...validEnvironment(), python: resolve('python.exe') }
  assert.equal(validateRealBrowserEnvironment(environment).restore, undefined)
})

test('恢复环境缺项、相对路径或非完整 runner SHA 时失败关闭', () => {
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
      verifierSha: 'b'.repeat(40),
      runnerSha: 'a'.repeat(40),
      python: resolve('python.exe'),
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
  assert.throws(() =>
    validateRealBrowserEnvironment({
      ...complete,
      restore: { ...complete.restore, python: 'python' },
    }),
  )
})

test('运行选项经过统一校验并保留显式选择', () => {
  const binding = validateRealBrowserEnvironment({
    ...validEnvironment(),
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
