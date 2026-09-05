import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import test from 'node:test'
import { validateRealBrowserEnvironment } from '../real-browser-environment.mjs'

function validEnvironment() {
  return {
    RYFRAME_E2E_SCOPE_ID: 'real-browser-unit',
    RYFRAME_E2E_TENANT_ID: 'system',
    RYFRAME_E2E_USERNAME: 'admin',
    RYFRAME_E2E_PASSWORD: 'not-recorded',
    RYFRAME_E2E_BACKEND_DIR: resolve('D 盘源码', '后端'),
    RYFRAME_E2E_RUNTIME_DIR: resolve('D 盘运行', '当前'),
    RYFRAME_E2E_RATE_LIMIT_CAPACITY: '100',
    RYFRAME_E2E_RATE_LIMIT_WINDOW_SECS: '60',
    RYFRAME_E2E_LOGIN_RATE_LIMIT_CAPACITY: '5',
    RYFRAME_E2E_LOGIN_RATE_LIMIT_WINDOW_SECS: '60',
    RYFRAME_E2E_LOGIN_BUDGET_STATE: resolve('D 盘运行', '登录 预算.json'),
    RYFRAME_E2E_BASE_URL: 'http://127.0.0.1:4174',
  }
}

test('登记环境完整时返回脱敏绑定，并保留中文空格绝对路径', () => {
  const environment = validEnvironment()
  const binding = validateRealBrowserEnvironment(environment)
  assert.equal(binding.scopeId, 'real-browser-unit')
  assert.equal(binding.backendDir, environment.RYFRAME_E2E_BACKEND_DIR)
  assert.equal(binding.loginBudgetState, environment.RYFRAME_E2E_LOGIN_BUDGET_STATE)
  assert.equal(binding.baseURL, 'http://127.0.0.1:4174')
  assert.equal(binding.port, 4174)
  assert.equal(binding.serverMode, 'dev')
  assert.equal(binding.fixture, 'core')
  assert.equal(binding.runId, undefined)
  assert.equal(JSON.stringify(binding).includes(environment.RYFRAME_E2E_PASSWORD), false)
  assert.equal(Object.isFrozen(binding), true)
})

test('运行选项经过统一校验并保留显式选择', () => {
  const binding = validateRealBrowserEnvironment({
    ...validEnvironment(),
    RYFRAME_E2E_FRONTEND_PORT: '49152',
    RYFRAME_E2E_SERVER: 'preview',
    RYFRAME_E2E_FIXTURE: 'device',
    RYFRAME_E2E_RUN_ID: 'attempt-12',
  })
  assert.deepEqual(
    {
      port: binding.port,
      serverMode: binding.serverMode,
      fixture: binding.fixture,
      runId: binding.runId,
    },
    { port: 49152, serverMode: 'preview', fixture: 'device', runId: 'attempt-12' },
  )
})

test('非法运行选项在创建产物和服务前失败', () => {
  for (const [name, value] of [
    ['RYFRAME_E2E_FRONTEND_PORT', '0'],
    ['RYFRAME_E2E_FRONTEND_PORT', '65536'],
    ['RYFRAME_E2E_SERVER', 'production'],
    ['RYFRAME_E2E_FIXTURE', 'unknown'],
    ['RYFRAME_E2E_RUN_ID', 'UPPER'],
    ['RYFRAME_E2E_RUN_ID', `a${'-a'.repeat(32)}`],
  ]) {
    assert.throws(() => validateRealBrowserEnvironment({ ...validEnvironment(), [name]: value }))
  }
})

test('任一登记、凭据引用、限流来源或账本路径缺失都会失败', () => {
  for (const name of Object.keys(validEnvironment())) {
    if (name === 'RYFRAME_E2E_BASE_URL') continue
    const environment = validEnvironment()
    delete environment[name]
    assert.throws(() => validateRealBrowserEnvironment(environment), /真实|缺少|必须/u, name)
  }
})

test('配置失真时不使用默认值或自动修正', () => {
  for (const [name, value] of [
    ['RYFRAME_E2E_SCOPE_ID', 'UPPER'],
    ['RYFRAME_E2E_RATE_LIMIT_CAPACITY', '0'],
    ['RYFRAME_E2E_RATE_LIMIT_WINDOW_SECS', '1.5'],
    ['RYFRAME_E2E_LOGIN_RATE_LIMIT_CAPACITY', '10001'],
    ['RYFRAME_E2E_LOGIN_BUDGET_STATE', 'relative/budget.json'],
    ['RYFRAME_E2E_BACKEND_DIR', `${resolve('backend')}\nother`],
  ]) {
    assert.throws(() => validateRealBrowserEnvironment({ ...validEnvironment(), [name]: value }))
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
    assert.throws(() =>
      validateRealBrowserEnvironment({ ...validEnvironment(), RYFRAME_E2E_BASE_URL: value }),
    )
  }
})
