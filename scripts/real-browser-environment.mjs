import { isAbsolute } from 'node:path'
import { loadToolInputs, toolObject } from './tool-inputs.mjs'
import { readBrowserControl } from './browser-control.mjs'
import { isResourceScopeId } from './resource-scope.mjs'

function required(environment, name) {
  const value = environment[name]
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`真实浏览器环境缺少 ${name}`)
  }
  return value
}

function positiveInteger(environment, name, maximum) {
  const raw = environment[name]
  if (!Number.isSafeInteger(raw) || raw < 1) throw new Error(`${name} 必须是正整数`)
  const value = Number(raw)
  if (!Number.isSafeInteger(value) || value > maximum) throw new Error(`${name} 超出有效范围`)
  return value
}

function optionalPositiveInteger(environment, name, fallback, maximum) {
  const raw = environment[name]
  if (raw === undefined) return fallback
  return positiveInteger(environment, name, maximum)
}

function choice(environment, name, fallback, choices) {
  const raw = environment[name]
  const value = raw === undefined ? fallback : raw
  if (!choices.includes(value)) throw new Error(`${name} 必须为 ${choices.join(' 或 ')}`)
  return value
}

function optionalRunId(environment) {
  const value = environment.runId
  if (
    value !== undefined &&
    (typeof value !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/u.test(value))
  ) {
    throw new Error('runId 必须是长度不超过 64 的小写字母、数字或连字符')
  }
  return value
}

function absolutePath(environment, name) {
  const value = required(environment, name)
  if (value !== value.trim() || /[\r\n\0]/u.test(value) || !isAbsolute(value)) {
    throw new Error(`${name} 必须是明确的绝对路径`)
  }
  return value
}

function commitSha(environment, name) {
  const value = required(environment, name)
  if (!/^[a-f0-9]{40}$/u.test(value)) throw new Error(`${name} 必须是完整小写提交 SHA`)
  return value
}

function localBaseUrl(value) {
  if (!value) return undefined
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error('baseURL 必须是本机 HTTP 原点')
  }
  if (
    url.protocol !== 'http:' ||
    !['127.0.0.1', '[::1]'].includes(url.hostname) ||
    !url.port ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('baseURL 必须是带明确端口的本机 HTTP 原点')
  }
  return url.origin
}

function restoreEnvironment(environment) {
  toolObject(
    environment,
    [
      'bindings',
      'runtimeReceipt',
      'targetPlan',
      'coordinatorDir',
      'verifierSha',
      'runnerSha',
      'python',
    ],
    'real_browser.restore',
  )
  const fields = [
    ['bindings', 'bindings'],
    ['runtimeReceipt', 'runtimeReceipt'],
    ['targetPlan', 'targetPlan'],
    ['coordinatorDir', 'coordinatorDir'],
    ['verifierSha', 'verifierSha'],
    ['runnerSha', 'runnerSha'],
    ['python', 'python'],
  ]
  const configured = fields.slice(0, -1).filter(([, name]) => environment[name] !== undefined)
  if (configured.length === 0) throw new Error('恢复浏览器环境缺少完整绑定')
  if (configured.length !== fields.length - 1 || environment.python === undefined)
    throw new Error(
      '恢复浏览器环境必须同时登记 bindings、target plan、运行收据、协调器、verifier SHA、runner SHA 和 Python',
    )
  return Object.freeze(
    Object.fromEntries(
      fields.map(([field, name]) => [
        field,
        field === 'runnerSha' || field === 'verifierSha'
          ? commitSha(environment, name)
          : absolutePath(environment, name),
      ]),
    ),
  )
}

/** 在创建报告目录和服务前验证真实环境，只返回不含凭据的运行绑定。 */
export function validateRealBrowserEnvironment(environment) {
  toolObject(
    environment,
    [
      'scopeId',
      'tenantId',
      'username',
      'password',
      'backendDir',
      'runtimeDir',
      'python',
      'requestCapacity',
      'requestWindowSeconds',
      'loginCapacity',
      'loginWindowSeconds',
      'loginBudgetState',
      'port',
      'serverMode',
      'fixture',
      'runId',
      'baseURL',
      'restore',
      'channel',
      'gateEndpoint',
      'previewResponseAudit',
      'captchaCode',
      'restorePasswords',
    ],
    'real_browser',
  )
  const scopeId = environment.scopeId
  if (!isResourceScopeId(scopeId)) {
    throw new Error('真实浏览器环境必须绑定明确的隔离 scope')
  }
  const tenantId = required(environment, 'tenantId').trim()
  const username = required(environment, 'username').trim()
  required(environment, 'password')
  if (environment.captchaCode !== undefined && typeof environment.captchaCode !== 'string')
    throw new Error('captchaCode 必须为字符串')
  if (
    environment.restorePasswords !== undefined &&
    (!environment.restorePasswords ||
      typeof environment.restorePasswords !== 'object' ||
      Array.isArray(environment.restorePasswords) ||
      Object.values(environment.restorePasswords).some(
        (value) => typeof value !== 'string' || !value.trim(),
      ))
  )
    throw new Error('restorePasswords 必须为租户 ID 到非空密码的映射')
  const fixture = choice(environment, 'fixture', 'core', ['core', 'business'])
  const runId = optionalRunId(environment)
  if (fixture === 'business' && !runId) {
    throw new Error('业务浏览器环境必须绑定全新的 runId')
  }
  const binding = {
    scopeId,
    tenantId,
    username,
    backendDir: absolutePath(environment, 'backendDir'),
    runtimeDir: absolutePath(environment, 'runtimeDir'),
    requestCapacity: positiveInteger(environment, 'requestCapacity', 2 ** 32 - 1),
    requestWindowSeconds: positiveInteger(environment, 'requestWindowSeconds', 86_400),
    loginCapacity: positiveInteger(environment, 'loginCapacity', 10_000),
    loginWindowSeconds: positiveInteger(environment, 'loginWindowSeconds', 86_400),
    loginBudgetState: absolutePath(environment, 'loginBudgetState'),
    port: optionalPositiveInteger(environment, 'port', 4174, 65_535),
    serverMode: choice(environment, 'serverMode', 'dev', ['dev', 'preview']),
    fixture,
    runId,
    baseURL:
      environment.baseURL === undefined
        ? undefined
        : localBaseUrl(required(environment, 'baseURL')),
    restore:
      environment.restore === undefined ? undefined : restoreEnvironment(environment.restore),
    python: absolutePath(environment, 'python'),
    channel: browserChannel(environment.channel),
    gateEndpoint: optionalAbsolutePath(environment, 'gateEndpoint'),
    previewResponseAudit: optionalAbsolutePath(environment, 'previewResponseAudit'),
  }
  return Object.freeze(binding)
}

export function browserChannel(value) {
  if (value === undefined) return process.env.CI ? undefined : 'chrome'
  if (value === 'chromium') return undefined
  if (
    ![
      'chrome',
      'chrome-beta',
      'chrome-dev',
      'chrome-canary',
      'msedge',
      'msedge-beta',
      'msedge-dev',
      'msedge-canary',
    ].includes(value)
  ) {
    throw new Error('channel 必须是受支持的浏览器通道或 chromium')
  }
  return value
}

function optionalAbsolutePath(environment, name) {
  return environment[name] === undefined ? undefined : absolutePath(environment, name)
}

export function loadRealBrowserInput(root = process.cwd()) {
  const input = loadToolInputs(root).value.real_browser
  const control = readBrowserControl(root)
  if (control && !control.real) throw new Error('浏览器控制文件模式不匹配')
  return { ...input, ...control?.overrides }
}

export function loadRealBrowserEnvironment(root = process.cwd()) {
  return validateRealBrowserEnvironment(loadRealBrowserInput(root))
}

export function realBrowserCredentials(root = process.cwd()) {
  const input = loadRealBrowserInput(root)
  validateRealBrowserEnvironment(input)
  return {
    tenantId: input.tenantId.trim(),
    username: input.username.trim(),
    password: input.password,
    captchaCode: input.captchaCode,
  }
}

export function restorePassword(tenantId, root = process.cwd()) {
  const passwords = loadRealBrowserInput(root).restorePasswords
  const value = passwords?.[tenantId]
  if (typeof value !== 'string' || !value.trim()) throw new Error('恢复租户缺少文件密码配置')
  return value
}
