import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { setTimeout as sleep } from 'node:timers/promises'
import { chromium, expect } from '@playwright/test'
import { selectLoginTenant } from '../tests/browser-real/login-tenant.ts'
import { isolatedOrigin, isIsolatedRequest } from '../tests/browser-real/network.ts'
import { captureSourceInventory, exactObject, localSourceFile } from './build-source-inventory.ts'
import { checkApplicationPath } from './application-config-paths.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const kind = 'ryframe-devex-homepage'
const fail = (code) => {
  throw new Error(code)
}
const fingerprint = (directory) => captureSourceInventory(directory).source.worktree_fingerprint
function validateSelection(receipt, identities) {
  exactObject(receipt, ['format_version', 'suite', 'selections'], 'homepage_selection_fields')
  const selection = receipt.selections?.[0]
  if (
    receipt.format_version !== 1 ||
    receipt.suite !== 'homepage' ||
    receipt.selections?.length !== 1
  )
    fail('homepage_selection_binding')
  exactObject(
    selection,
    [
      'identity_pool',
      'count',
      'tenant_distribution',
      'roles_sha256',
      'permissions_sha256',
      'slots',
      'workflow',
    ],
    'homepage_selection_fields',
  )
  if (
    selection.workflow !== 'homepage' ||
    selection.count !== identities.length ||
    selection.slots?.length !== identities.length ||
    !/^[a-z][a-z0-9-]{0,63}$/u.test(selection.identity_pool) ||
    !/^[a-f0-9]{64}$/u.test(selection.roles_sha256) ||
    !/^[a-f0-9]{64}$/u.test(selection.permissions_sha256)
  )
    fail('homepage_selection_binding')
  const users = new Set()
  const tenants = new Map()
  const reverse = new Map()
  const distribution = Object.create(null)
  for (const [index, slot] of selection.slots.entries()) {
    exactObject(slot, ['tenant_slot', 'user_slot', 'client_address'], 'homepage_slot_fields')
    if (
      ![slot.tenant_slot, slot.user_slot].every((value) => /^[a-z][a-z0-9-]{0,63}$/u.test(value)) ||
      users.has(slot.user_slot)
    )
      fail('homepage_slot_binding')
    const tenant = identities[index]?.tenant_id
    if (
      (tenants.has(slot.tenant_slot) && tenants.get(slot.tenant_slot) !== tenant) ||
      (reverse.has(tenant) && reverse.get(tenant) !== slot.tenant_slot)
    )
      fail('homepage_slot_binding')
    users.add(slot.user_slot)
    tenants.set(slot.tenant_slot, tenant)
    reverse.set(tenant, slot.tenant_slot)
    distribution[slot.tenant_slot] = (distribution[slot.tenant_slot] ?? 0) + 1
  }
  exactObject(selection.tenant_distribution, Object.keys(distribution), 'homepage_distribution')
  if (
    Object.entries(distribution).some(
      ([key, count]) => selection.tenant_distribution[key] !== count,
    )
  )
    fail('homepage_distribution')
  return selection
}
async function bounded(operation, timeout) {
  let timer
  try {
    return await Promise.race([
      operation,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(Object.assign(new Error('homepage_timeout'), { name: 'TimeoutError' })),
          timeout,
        )
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

/** stdin 是唯一输入；产物目录与身份选择收据由后端控制器预先建立。 */
export function validateHomepageInput(value, directory = root) {
  exactObject(
    value,
    [
      'format_version',
      'kind',
      'cache',
      'frontend_url',
      'timeout_ms',
      'visitor_interval_ms',
      'identities',
      'artifacts',
      'runner_frontend_fingerprint',
    ],
    'homepage_input_fields',
  )
  if (value.format_version !== 1 || value.kind !== kind || !['cold', 'warm'].includes(value.cache))
    fail('homepage_input_version_or_cache')
  const origin = isolatedOrigin(value.frontend_url)
  if (value.frontend_url !== origin || !new URL(origin).port) fail('homepage_origin_binding')
  if (!Number.isSafeInteger(value.timeout_ms) || value.timeout_ms < 1 || value.timeout_ms > 300_000)
    fail('homepage_timeout')
  if (
    !Number.isSafeInteger(value.visitor_interval_ms) ||
    value.visitor_interval_ms < 0 ||
    value.visitor_interval_ms > 60_000
  )
    fail('homepage_interval')
  if (
    !Array.isArray(value.identities) ||
    !value.identities.length ||
    value.identities.length > 10_000
  )
    fail('homepage_identities')
  if (typeof value.artifacts !== 'string' || !path.isAbsolute(value.artifacts))
    fail('homepage_artifacts')
  checkApplicationPath(value.artifacts, { directory: true, label: '首页测量产物目录' })
  const receiptPath = localSourceFile(
    value.artifacts,
    'identity-selection.json',
    'homepage_selection_path',
  )
  if (fs.statSync(receiptPath).size > 4 * 1024 * 1024) fail('homepage_selection_size')
  const receiptBytes = fs.readFileSync(receiptPath)
  const receipt = JSON.parse(receiptBytes)
  const selection = validateSelection(receipt, value.identities)
  const subjects = new Set()
  const addresses = new Set()
  for (const [index, identity] of value.identities.entries()) {
    exactObject(
      identity,
      ['tenant_id', 'username', 'password', 'client_address'],
      'homepage_identity_fields',
    )
    if (
      typeof identity.tenant_id !== 'string' ||
      !/^[a-zA-Z0-9_-]{1,64}$/u.test(identity.tenant_id) ||
      typeof identity.username !== 'string' ||
      !identity.username.trim() ||
      identity.username.length > 64 ||
      typeof identity.password !== 'string' ||
      !identity.password ||
      identity.password.length > 4096 ||
      !/^198\.(18|19)\.(0|[1-9]\d{0,2})\.(0|[1-9]\d{0,2})$/u.test(identity.client_address) ||
      identity.client_address.split('.').some((part) => Number(part) > 255) ||
      identity.client_address !== selection.slots[index].client_address
    )
      fail('homepage_identity_binding')
    const subject = JSON.stringify([identity.tenant_id, identity.username.trim().toLowerCase()])
    if (subjects.has(subject) || addresses.has(identity.client_address))
      fail('homepage_identity_duplicate')
    subjects.add(subject)
    addresses.add(identity.client_address)
  }
  if (
    !/^sha256:[a-f0-9]{64}$/u.test(value.runner_frontend_fingerprint) ||
    fingerprint(directory) !== value.runner_frontend_fingerprint
  )
    fail('homepage_runner_binding')
  return () => {
    checkApplicationPath(value.artifacts, { directory: true, label: '首页测量产物目录' })
    const current = localSourceFile(
      value.artifacts,
      'identity-selection.json',
      'homepage_selection_changed',
    )
    if (
      !fs.readFileSync(current).equals(receiptBytes) ||
      fingerprint(directory) !== value.runner_frontend_fingerprint
    )
      fail('homepage_binding_changed')
  }
}

function validateSession(session, identity) {
  if (
    session?.user?.tenant_id !== identity.tenant_id ||
    session?.user?.username !== identity.username ||
    session.password_change_required !== false ||
    typeof session.user.id !== 'string'
  )
    fail('homepage_session_binding')
}

/** CDP 请求标识只用于合并事件，收据不包含任何资源 URL。 */
export function observeHomepageStaticCache(session, origin, phase) {
  const assetPrefix = '/assets/'
  const requests = new Map()
  const servedFromCache = new Set()
  session.on('Network.requestWillBeSent', ({ requestId, request, redirectResponse, type }) => {
    // 同一请求标识贯穿跳转链，目标响应也不能算作直接资源读取。
    if (redirectResponse) {
      requests.delete(requestId)
      return
    }
    const stage = phase()
    if (
      !['warming', 'measuring'].includes(stage) ||
      request.method !== 'GET' ||
      type === 'Prefetch'
    )
      return
    const url = URL.parse(request.url)
    if (
      url?.origin !== origin ||
      url.username ||
      url.password ||
      !url.pathname.startsWith(assetPrefix) ||
      /%2f|%5c/iu.test(url.pathname)
    )
      return
    let relative
    try {
      relative = decodeURIComponent(url.pathname.slice(assetPrefix.length))
    } catch {
      return
    }
    const parts = relative.split('/')
    if (
      /[\\\p{Cc}]/u.test(relative) ||
      (process.platform === 'win32' && relative.includes(':')) ||
      parts.some((part) => part === '' || part === '.' || part === '..') ||
      !/^.+\.(?:js|css|woff2?|ttf|svg|png|jpe?g|webp|ico)$/iu.test(parts.at(-1))
    )
      return
    requests.set(requestId, { stage, url: url.href })
  })
  session.on('Network.requestServedFromCache', ({ requestId }) => {
    servedFromCache.add(requestId)
  })
  session.on('Network.responseReceived', ({ requestId, response, type }) => {
    const request = requests.get(requestId)
    if (
      request?.stage === phase() &&
      request.url === response.url &&
      response.status >= 200 &&
      response.status < 300 &&
      !response.fromServiceWorker &&
      !response.fromPrefetchCache &&
      type !== 'Prefetch'
    )
      request.response = { hit: response.fromDiskCache === true }
  })
  session.on('Network.loadingFinished', ({ requestId }) => {
    const request = requests.get(requestId)
    if (request?.stage === phase()) request.finished = true
  })

  return () => {
    const primed = new Set()
    const measured = new Set()
    const hits = new Set()
    for (const [id, entry] of requests) {
      if (!entry.response || !entry.finished) continue
      if (entry.stage === 'warming') primed.add(entry.url)
      // 按请求起始顺序归因，避免同一测量导航稍后的缓存复用抬高首次读取。
      else if (!measured.has(entry.url)) {
        measured.add(entry.url)
        if (entry.response.hit || servedFromCache.has(id)) hits.add(entry.url)
      }
    }
    return {
      responses: measured.size,
      hits: hits.size,
      primed_hits: [...hits].filter((url) => primed.has(url)).length,
    }
  }
}

/** CDP 拦截不使用 Playwright HTTP route，保留浏览器的真实 HTTP 缓存。 */
async function preparePage(context, input, row, identity) {
  const page = await context.newPage()
  page.setDefaultTimeout(input.timeout_ms)
  page.setDefaultNavigationTimeout(input.timeout_ms)
  const session = await context.newCDPSession(page)
  await session.send('Network.enable')
  await session.send('Network.setCacheDisabled', { cacheDisabled: false })
  const staticCache = observeHomepageStaticCache(session, input.frontend_url, () => row.phase)
  const pending = new Set()
  const note = (code) => {
    if (!row.diagnostics.includes(code)) row.diagnostics.push(code)
  }
  session.on('Fetch.requestPaused', (event) => {
    const allowed = isIsolatedRequest(event.request.url, input.frontend_url)
    if (!allowed) note('homepage_network_origin')
    const action = session
      .send(allowed ? 'Fetch.continueRequest' : 'Fetch.failRequest', {
        requestId: event.requestId,
        ...(!allowed ? { errorReason: 'BlockedByClient' } : {}),
      })
      .catch(() => note('homepage_network_interception'))
    pending.add(action)
    void action.finally(() => pending.delete(action))
  })
  await session.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] })
  await context.routeWebSocket('**/*', async (socket) => {
    if (isIsolatedRequest(socket.url(), input.frontend_url)) socket.connectToServer()
    else {
      note('homepage_network_origin')
      await socket.close({ code: 1008, reason: '隔离范围之外的连接' })
    }
  })
  page.on('request', () => {
    if (row.phase === 'measuring') row.measured_requests += 1
    else row.preparation_requests += 1
  })
  page.on('requestfailed', () => note('homepage_network_request_failed'))
  page.on('response', (response) => {
    if (response.status() >= 400) note(`homepage_http_${response.status()}`)
    const pathname = new URL(response.url()).pathname
    if (response.ok() && ['/api/v1/auth/refresh', '/api/v1/auth/context'].includes(pathname)) {
      const action = bounded(response.json(), input.timeout_ms)
        .then((body) =>
          validateSession(
            pathname.endsWith('/context') ? body?.data : body?.data?.session_context,
            identity,
          ),
        )
        .catch(() => note('homepage_session_binding'))
      pending.add(action)
      void action.finally(() => pending.delete(action))
    }
  })
  page.on('pageerror', () => note('homepage_page_error'))
  await page.addInitScript(() => {
    globalThis.__ryframeHomepageLcp = 0
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) globalThis.__ryframeHomepageLcp = entry.startTime
    }).observe({ type: 'largest-contentful-paint', buffered: true })
  })
  return { page, staticCache, settle: () => Promise.all([...pending]) }
}

async function login(page, input, identity) {
  await page.goto(`${input.frontend_url}/login`, { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { name: 'RyFrame' })).toBeVisible({
    timeout: input.timeout_ms,
  })
  const button = page.getByRole('button', { name: '登录', exact: true })
  await expect(button).toBeEnabled({ timeout: input.timeout_ms })
  await selectLoginTenant(page, identity.tenant_id)
  await page.getByPlaceholder('用户名', { exact: true }).fill(identity.username)
  await page.getByPlaceholder('密码', { exact: true }).fill(identity.password)
  if (await page.getByPlaceholder('验证码', { exact: true }).isVisible())
    fail('homepage_captcha_requires_disabled_fixture')
  const response = page.waitForResponse(
    (item) =>
      new URL(item.url()).pathname === '/api/v1/auth/login' && item.request().method() === 'POST',
  )
  const [result] = await Promise.all([response, button.click()])
  if (!result.ok()) fail('homepage_login_rejected')
  validateSession((await bounded(result.json(), input.timeout_ms))?.data?.session_context, identity)
  await page.waitForURL(`${input.frontend_url}/index`)
  await page.waitForLoadState('networkidle')
}

async function visit(page, input, identity) {
  await page.goto(`${input.frontend_url}/index`, { waitUntil: 'load' })
  const account = page.locator('main.workspace .account-summary dd').first()
  await account.waitFor({ state: 'visible' })
  await expect(account).toHaveText(identity.username, { timeout: input.timeout_ms })
  const content = await page.evaluate(
    () =>
      new Promise((resolve) => {
        globalThis.requestAnimationFrame(() =>
          globalThis.requestAnimationFrame(() => resolve(performance.now())),
        )
      }),
  )
  await page.waitForLoadState('networkidle')
  await page.waitForFunction(() => globalThis.__ryframeHomepageLcp > 0)
  const times = await page.evaluate(() => ({
    navigation: performance.getEntriesByType('navigation')[0]?.duration,
    lcp: globalThis.__ryframeHomepageLcp,
  }))
  if (![content, times.navigation, times.lcp].every((value) => Number.isFinite(value) && value > 0))
    fail('homepage_real_timing')
  if (page.url() !== `${input.frontend_url}/index`) fail('homepage_session_lost')
  return { ...times, content }
}

async function cycle(browser, input, identity, index) {
  const start = performance.now()
  const row = {
    cycle: index,
    cache: input.cache,
    client_address: identity.client_address,
    phase: 'preparing',
    succeeded: false,
    session_failure: false,
    preparation_requests: 0,
    measured_requests: 0,
    static_cache: { responses: 0, hits: 0, primed_hits: 0 },
    diagnostics: [],
    preparation_duration_ms: 0,
    times: { navigation: 0, lcp: 0, content: 0 },
    duration_ms: 0,
  }
  let context
  let staticCache
  try {
    if (!browser) fail('homepage_browser_launch_failed')
    context = await browser.newContext({
      locale: 'zh-CN',
      viewport: { width: 1440, height: 900 },
      serviceWorkers: 'block',
      extraHTTPHeaders: { 'X-Forwarded-For': identity.client_address },
    })
    const prepared = await preparePage(context, input, row, identity)
    const { page, settle } = prepared
    staticCache = prepared.staticCache
    row.phase = 'login'
    await login(page, input, identity)
    await bounded(settle(), input.timeout_ms)
    if (row.diagnostics.length) fail('homepage_login_validation_failed')
    row.phase = input.cache === 'warm' ? 'warming' : 'preparing'
    if (input.cache === 'warm') await visit(page, input, identity)
    else {
      const session = await context.newCDPSession(page)
      await session.send('Network.clearBrowserCache')
      await session.detach()
    }
    if (row.diagnostics.length) fail('homepage_preparation_failed')
    row.preparation_duration_ms = performance.now() - start
    row.phase = 'measuring'
    row.times = await visit(page, input, identity)
    await bounded(settle(), input.timeout_ms)
    if (row.diagnostics.length || row.measured_requests < 1) fail('homepage_measurement_failed')
    row.static_cache = staticCache()
    if (input.cache === 'cold' && (row.static_cache.responses === 0 || row.static_cache.hits !== 0))
      fail('homepage_cold_cache_unproven')
    if (input.cache === 'warm' && row.static_cache.primed_hits === 0)
      fail('homepage_warm_cache_unproven')
    row.succeeded = true
  } catch (error) {
    if (staticCache) row.static_cache = staticCache()
    row.session_failure = row.phase === 'login'
    const timeout = error?.name === 'TimeoutError'
    row.failure = timeout
      ? 'timeout'
      : row.diagnostics.some((code) => /network|http|binding|session/u.test(code)) ||
          /binding|session/u.test(error?.message ?? '')
        ? 'network_or_binding'
        : 'browser_validation_failed'
    const code = /^homepage_[a-z_]+$/u.test(error?.message ?? '')
      ? error.message
      : timeout
        ? 'homepage_timeout'
        : 'homepage_browser_failure'
    if (!row.diagnostics.includes(code)) row.diagnostics.push(code)
  } finally {
    try {
      await context?.close()
    } catch {
      row.succeeded = false
      row.failure = 'browser_validation_failed'
      row.diagnostics.push('homepage_context_cleanup_failed')
    }
    row.duration_ms = performance.now() - start
    if (!row.preparation_duration_ms) row.preparation_duration_ms = row.duration_ms
  }
  return row
}

export async function runHomepage(input) {
  const verify = validateHomepageInput(input)
  const start = performance.now()
  // 独立无持久化浏览器实例，不连接共享 CDP、不读取项目配置环境变量。
  let browser
  try {
    browser = await chromium.launch({
      headless: true,
      timeout: input.timeout_ms,
      ...(process.platform === 'win32' ? { channel: 'chrome' } : {}),
    })
  } catch {
    // 安装或启动失败仍保留每个选中身份的 preparing 失败项。
  }
  const cycles = []
  try {
    for (const [index, identity] of input.identities.entries()) {
      if (index) await sleep(input.visitor_interval_ms)
      cycles.push(await cycle(browser, input, identity, index))
    }
  } finally {
    await browser?.close()
  }
  verify()
  return {
    format_version: 1,
    kind,
    cache: input.cache,
    elapsed_ms: performance.now() - start,
    cycles,
  }
}

/** 原始异常可能包含 URL、请求头或凭据，仅向 stderr 输出固定诊断。 */
export async function main() {
  try {
    if (process.argv.length !== 2) fail('homepage_stdin_only')
    let bytes = ''
    process.stdin.setEncoding('utf8')
    for await (const chunk of process.stdin) {
      bytes += chunk
      if (Buffer.byteLength(bytes) > 8 * 1024 * 1024) fail('homepage_input_size')
    }
    const result = await runHomepage(JSON.parse(bytes))
    process.stdout.write(`${JSON.stringify(result)}\n`)
  } catch (error) {
    const code = /^homepage_[a-z_]+$/u.test(error?.message ?? '')
      ? error.message
      : 'homepage_input_or_binding'
    process.stderr.write(
      `首页浏览器入口失败：${code}；请检查 stdin 契约、身份选择收据、源码指纹及本机浏览器安装。凭据与原始异常未输出。\n`,
    )
    process.exitCode = 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href)
  await main()
