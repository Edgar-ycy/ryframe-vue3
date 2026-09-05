import { isAbsolute } from 'node:path'

function required(environment, name) {
  const value = environment[name]
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`真实浏览器环境缺少 ${name}`)
  }
  return value
}

function positiveInteger(environment, name, maximum) {
  const raw = required(environment, name)
  if (!/^[1-9][0-9]*$/u.test(raw)) throw new Error(`${name} 必须是正整数字符串`)
  const value = Number(raw)
  if (!Number.isSafeInteger(value) || value > maximum) throw new Error(`${name} 超出有效范围`)
  return value
}

function absolutePath(environment, name) {
  const value = required(environment, name)
  if (value !== value.trim() || /[\r\n\0]/u.test(value) || !isAbsolute(value)) {
    throw new Error(`${name} 必须是明确的绝对路径`)
  }
  return value
}

function localBaseUrl(value) {
  if (!value) return undefined
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error('RYFRAME_E2E_BASE_URL 必须是本机 HTTP 原点')
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
    throw new Error('RYFRAME_E2E_BASE_URL 必须是带明确端口的本机 HTTP 原点')
  }
  return url.origin
}

/** 在创建报告目录和服务前验证真实环境，只返回不含凭据的运行绑定。 */
export function validateRealBrowserEnvironment(environment = process.env) {
  const scopeId = environment.RYFRAME_E2E_SCOPE_ID || environment.APP_SCOPE_ID
  if (!/^[a-z0-9][a-z0-9-]{2,63}$/u.test(scopeId || '')) {
    throw new Error('真实浏览器环境必须绑定明确的隔离 scope')
  }
  const tenantId = required(environment, 'RYFRAME_E2E_TENANT_ID').trim()
  const username = required(environment, 'RYFRAME_E2E_USERNAME').trim()
  required(environment, 'RYFRAME_E2E_PASSWORD')
  const binding = {
    scopeId,
    tenantId,
    username,
    backendDir: absolutePath(environment, 'RYFRAME_E2E_BACKEND_DIR'),
    runtimeDir: absolutePath(environment, 'RYFRAME_E2E_RUNTIME_DIR'),
    requestCapacity: positiveInteger(environment, 'RYFRAME_E2E_RATE_LIMIT_CAPACITY', 2 ** 32 - 1),
    requestWindowSeconds: positiveInteger(
      environment,
      'RYFRAME_E2E_RATE_LIMIT_WINDOW_SECS',
      86_400,
    ),
    loginCapacity: positiveInteger(environment, 'RYFRAME_E2E_LOGIN_RATE_LIMIT_CAPACITY', 10_000),
    loginWindowSeconds: positiveInteger(
      environment,
      'RYFRAME_E2E_LOGIN_RATE_LIMIT_WINDOW_SECS',
      86_400,
    ),
    loginBudgetState: absolutePath(environment, 'RYFRAME_E2E_LOGIN_BUDGET_STATE'),
    baseURL: localBaseUrl(environment.RYFRAME_E2E_BASE_URL?.trim()),
  }
  return Object.freeze(binding)
}
