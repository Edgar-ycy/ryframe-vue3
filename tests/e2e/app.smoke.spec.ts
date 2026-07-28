import { expect, test, type Page, type Route } from '@playwright/test'

const apiBasePath = '/api/v1'

interface ApiMockState {
  unexpectedRequests: string[]
  generationRequests: unknown[]
  refreshRequests: number
  refreshAttempts: Array<{
    cookieJti: string | null
    csrfToken: string | undefined
    status: number
  }>
  logoutRequests: number
  protectedUnauthorizedRequests: string[]
  refreshSessionActive: boolean
  expireAccessToken(): void
  revokeRefreshSession(): void
  queueRefreshConflict(): void
  holdNextRefresh(): void
  releaseRefresh(): void
  setRefreshUnavailable(unavailable: boolean): void
  avatarDownloads: Array<{
    path: string | null
    bucket: string | null
    authorization: string | undefined
    tenantId: string | undefined
  }>
}

interface RefreshGate {
  promise: Promise<void>
  release(): void
}

const testUserInfo = {
  id: '1001',
  tenant_id: 'system',
  tenant_name: '系统租户',
  username: 'operator',
  nickname: '测试用户',
  email: 'operator@example.com',
  phone: '13800000000',
  avatar: null,
  roles: ['operator'],
  perms: ['system:dict:list', 'monitor:runtime:list', 'tools:gen:list', 'tools:gen:add'],
}

const avatarPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)

function protectedAvatarUrl(filename: string): string {
  return `${apiBasePath}/common/file/download?bucket=avatar&path=system/2026/07/17/${filename}`
}

function json(
  route: Route,
  body: unknown,
  status = 200,
  headers?: Record<string, string>,
): Promise<void> {
  return route.fulfill({
    status,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify(body),
    headers,
  })
}

function parseCookies(cookieHeader: string | undefined): Map<string, string> {
  return new Map((cookieHeader ?? '').split(';').flatMap((part) => {
    const separator = part.indexOf('=')
    if (separator < 0) return []
    return [[part.slice(0, separator).trim(), part.slice(separator + 1).trim()]]
  }))
}

function createGate(): RefreshGate {
  let release!: () => void
  const promise = new Promise<void>((resolve) => { release = resolve })
  return { promise, release }
}

function authResponse(accessToken: string) {
  return {
    code: 200,
    msg: 'ok',
    data: {
      access_token: accessToken,
      expires_in: 3600,
      user_info: testUserInfo,
    },
  }
}

async function installApiMocks(page: Page): Promise<ApiMockState> {
  await page.context().addInitScript(() => {
    class E2eMessageSocket {
      readyState = 0
      onopen: ((event: Event) => void) | null = null
      onclose: ((event: CloseEvent) => void) | null = null
      onerror: ((event: Event) => void) | null = null
      onmessage: ((event: MessageEvent) => void) | null = null

      constructor() {
        setTimeout(() => {
          this.readyState = 1
          this.onopen?.(new Event('open'))
        }, 0)
      }

      send(): void {}

      close(): void {
        if (this.readyState === 3) return
        this.readyState = 3
        this.onclose?.(new CloseEvent('close'))
      }
    }

    Object.defineProperty(window, 'WebSocket', {
      configurable: true,
      writable: true,
      value: E2eMessageSocket,
    })
  })

  const unexpectedRequests: string[] = []
  const generationRequests: unknown[] = []
  const avatarDownloads: ApiMockState['avatarDownloads'] = []
  const refreshAttempts: ApiMockState['refreshAttempts'] = []
  const protectedUnauthorizedRequests: string[] = []
  let avatarUrl = protectedAvatarUrl('old-avatar.png')
  let csrfCounter = 0
  let refreshRequests = 0
  let logoutRequests = 0
  let refreshSessionActive = false
  let refreshUnavailable = false
  let refreshCounter = 0
  let accessCounter = 0
  let currentRefreshJti: string | null = null
  let currentAccessToken: string | null = null
  let refreshInFlightJti: string | null = null
  let queuedRefreshConflicts = 0
  let refreshGate: RefreshGate | undefined
  const expiredAccessTokens = new Set<string>()
  const recentlyRotatedRefreshJtis = new Set<string>()

  const issueAccessToken = () => {
    accessCounter += 1
    currentAccessToken = `access-token-${accessCounter}`
    return currentAccessToken
  }
  const issueRefreshJti = () => {
    refreshCounter += 1
    currentRefreshJti = `refresh-jti-${refreshCounter}`
    return currentRefreshJti
  }
  const refreshCookie = (jti: string) => (
    `ryframe_refresh_token=${jti}; Path=/api/v1/auth; HttpOnly; SameSite=Lax`
  )
  const deleteRefreshCookie = (
    'ryframe_refresh_token=; Path=/api/v1/auth; Max-Age=0; HttpOnly; SameSite=Lax'
  )
  const hasValidCsrf = (headers: Record<string, string>) => {
    const csrfToken = headers['x-csrf-token']
    return Boolean(csrfToken && parseCookies(headers.cookie).get('ryframe_csrf') === csrfToken)
  }
  const hasValidAccess = (headers: Record<string, string>) => {
    if (!currentAccessToken || expiredAccessTokens.has(currentAccessToken)) return false
    return headers.authorization === `Bearer ${currentAccessToken}`
      && headers['x-tenant-id'] === 'system'
  }
  const requireAccess = async (route: Route, label: string) => {
    if (hasValidAccess(route.request().headers())) return true
    protectedUnauthorizedRequests.push(route.request().headers()['x-e2e-probe'] ?? label)
    await json(route, { code: 401, msg: 'access token expired' }, 401)
    return false
  }

  await page.context().route(`**${apiBasePath}/**`, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const key = `${request.method()} ${url.pathname}`

    switch (key) {
      case `GET ${apiBasePath}/auth/csrf`: {
        csrfCounter += 1
        const csrfToken = `csrf-${csrfCounter}`
        await json(
          route,
          { code: 200, msg: 'ok', data: { csrf_token: csrfToken, expires_in: 300 } },
          200,
          { 'set-cookie': `ryframe_csrf=${csrfToken}; Path=/api/v1/auth; SameSite=Lax` },
        )
        return
      }
      case `GET ${apiBasePath}/auth/captcha/config`:
        await json(route, { code: 200, msg: 'ok', data: { captcha_enabled: false } })
        return
      case `POST ${apiBasePath}/auth/login`: {
        const body = request.postDataJSON() as Record<string, unknown>
        const valid = request.headers()['x-tenant-id'] === 'system'
          && hasValidCsrf(request.headers())
          && body.username === 'operator'
          && body.password === 'Strong@123'
        if (!valid) {
          await json(route, { code: 401, msg: 'invalid test credentials' }, 401)
          return
        }
        refreshSessionActive = true
        recentlyRotatedRefreshJtis.clear()
        const accessToken = issueAccessToken()
        const refreshJti = issueRefreshJti()
        await json(route, authResponse(accessToken), 200, {
          'set-cookie': refreshCookie(refreshJti),
        })
        return
      }
      case `POST ${apiBasePath}/auth/ws-ticket`:
        if (!await requireAccess(route, 'auth/ws-ticket')) return
        await json(route, {
          code: 200,
          msg: 'ok',
          data: { ticket: 'e2e-message-ticket', expires_in: 30 },
        })
        return
      case `POST ${apiBasePath}/auth/refresh`: {
        refreshRequests += 1
        const headers = request.headers()
        const cookieJti = parseCookies(headers.cookie).get('ryframe_refresh_token') ?? null
        const attempt = {
          cookieJti,
          csrfToken: headers['x-csrf-token'],
          status: 0,
        }
        refreshAttempts.push(attempt)
        const respond = async (
          body: unknown,
          status: number,
          responseHeaders?: Record<string, string>,
        ) => {
          attempt.status = status
          await json(route, body, status, responseHeaders)
        }
        if (refreshUnavailable) {
          await respond({ code: 503, msg: 'redis unavailable' }, 503)
          return
        }
        if (!refreshSessionActive || !currentRefreshJti || !hasValidCsrf(headers)) {
          refreshSessionActive = false
          currentRefreshJti = null
          await respond({ code: 401, msg: 'no refresh session' }, 401, {
            'set-cookie': deleteRefreshCookie,
          })
          return
        }
        if (queuedRefreshConflicts > 0) {
          queuedRefreshConflicts -= 1
          await respond({ code: 409, msg: 'refresh already in progress' }, 409, {
            'retry-after': '0',
          })
          return
        }
        if (cookieJti !== currentRefreshJti) {
          if (cookieJti && recentlyRotatedRefreshJtis.has(cookieJti)) {
            await respond({ code: 409, msg: 'refresh already in progress' }, 409, {
              'retry-after': '0',
            })
            return
          }
          refreshSessionActive = false
          currentRefreshJti = null
          await respond({ code: 401, msg: 'refresh replay detected' }, 401, {
            'set-cookie': deleteRefreshCookie,
          })
          return
        }
        if (refreshInFlightJti === cookieJti) {
          await respond({ code: 409, msg: 'refresh already in progress' }, 409, {
            'retry-after': '0',
          })
          return
        }

        refreshInFlightJti = cookieJti
        const gate = refreshGate
        try {
          if (gate) {
            await gate.promise
            if (refreshGate === gate) refreshGate = undefined
          }
          if (!refreshSessionActive || currentRefreshJti !== cookieJti) {
            await respond({ code: 401, msg: 'refresh session revoked' }, 401, {
              'set-cookie': deleteRefreshCookie,
            })
            return
          }
          recentlyRotatedRefreshJtis.add(cookieJti)
          const accessToken = issueAccessToken()
          const rotatedJti = issueRefreshJti()
          await respond(authResponse(accessToken), 200, {
            'set-cookie': refreshCookie(rotatedJti),
          })
        }
        finally {
          if (refreshInFlightJti === cookieJti) refreshInFlightJti = null
        }
        return
      }
      case `POST ${apiBasePath}/auth/logout`:
        logoutRequests += 1
        if (!hasValidCsrf(request.headers())) {
          await json(route, { code: 403, msg: 'invalid csrf challenge' }, 403)
          return
        }
        refreshSessionActive = false
        currentRefreshJti = null
        await json(route, { code: 200, msg: 'ok' }, 200, {
          'set-cookie': deleteRefreshCookie,
        })
        return
      case `GET ${apiBasePath}/auth/me`:
        if (!await requireAccess(route, 'auth/me')) return
        await json(route, {
          code: 200,
          msg: 'ok',
          data: {
            id: '1001',
            tenant_id: 'system',
            tenant_name: '系统租户',
            dept_name: '测试部门',
            username: 'operator',
            nickname: '测试用户',
            email: 'operator@example.com',
            phone: '13800000000',
            avatar: null,
            roles: ['operator'],
            perms: ['system:dict:list', 'monitor:runtime:list', 'tools:gen:list', 'tools:gen:add'],
          },
        })
        return
      case `GET ${apiBasePath}/auth/profile`:
        if (!await requireAccess(route, 'auth/profile')) return
        await json(route, {
          code: 200,
          msg: 'ok',
          data: {
            user_id: '1001',
            username: 'operator',
            nickname: '测试用户',
            email: 'operator@example.com',
            phone: '13800000000',
            avatar: avatarUrl,
            dept_name: '测试部门',
            roles: ['operator'],
            permissions: ['system:dict:list'],
            status: '1',
            created_at: '2026-07-17T00:00:00Z',
          },
        })
        return
      case `PUT ${apiBasePath}/auth/profile/avatar`:
        avatarUrl = protectedAvatarUrl('new-avatar.png')
        await json(route, {
          code: 200,
          msg: 'ok',
          data: { avatar_url: avatarUrl },
        })
        return
      case `GET ${apiBasePath}/common/file/download`: {
        const headers = request.headers()
        avatarDownloads.push({
          path: url.searchParams.get('path'),
          bucket: url.searchParams.get('bucket'),
          authorization: headers.authorization,
          tenantId: headers['x-tenant-id'],
        })
        if (!hasValidAccess(headers)) {
          await json(route, { code: 401, msg: 'missing authentication' }, 401)
          return
        }
        await route.fulfill({ status: 200, contentType: 'image/png', body: avatarPng })
        return
      }
      case `GET ${apiBasePath}/system/menus/current`:
        if (!await requireAccess(route, 'system/menus/current')) return
        await json(route, {
          code: 200,
          msg: 'ok',
          data: [
            {
              id: '2000',
              name: '系统管理',
              route_key: 'system',
              menu_type: 'M',
              icon: 'Setting',
              sort: 1,
              status: '1',
              visible: true,
              children: [
                {
                  id: '2001',
                  name: '字典管理',
                  route_key: 'system.dict',
                  menu_type: 'C',
                  perm_code: 'system:dict:list',
                  icon: 'Collection',
                  sort: 1,
                  status: '1',
                  visible: true,
                  children: [],
                },
              ],
            },
            {
              id: '2100',
              name: '系统监控',
              route_key: 'monitor',
              menu_type: 'M',
              icon: 'Monitor',
              sort: 2,
              status: '1',
              visible: true,
              children: [
                {
                  id: '2101',
                  name: '运行时状态',
                  route_key: 'monitor.runtime',
                  menu_type: 'C',
                  perm_code: 'monitor:runtime:list',
                  icon: 'DataLine',
                  sort: 1,
                  status: '1',
                  visible: true,
                  children: [],
                },
              ],
            },
            {
              id: '2200',
              name: '系统工具',
              route_key: 'tools',
              menu_type: 'M',
              icon: 'Tools',
              sort: 3,
              status: '1',
              visible: true,
              children: [
                {
                  id: '2201',
                  name: '代码生成',
                  route_key: 'tools.gen',
                  menu_type: 'C',
                  perm_code: 'tools:gen:list',
                  icon: 'MagicStick',
                  sort: 1,
                  status: '1',
                  visible: true,
                  children: [],
                },
              ],
            },
          ],
        })
        return
      case `GET ${apiBasePath}/monitor/runtime`:
        await json(route, {
          code: 200,
          msg: 'ok',
          data: {
            database: {
              connected: true,
              driver: 'mysql',
              primary_connected: true,
              replica_count: 0,
              replicas: [],
              source_count: 0,
              sources: [],
              read_policy: 'primary',
            },
            redis: { configured: true, connected: true },
            object_storage: {
              backend: 'rustfs',
              connected: true,
              endpoint: 'http://127.0.0.1:9000',
            },
            upload_circuit_breaker: { state: 'Closed' },
          },
        })
        return
      case `GET ${apiBasePath}/system/dict/types`:
        await json(route, {
          code: 200,
          msg: 'ok',
          rows: [
            { id: '3001', name: '登录状态', code: 'sys_common_status', status: '1' },
          ],
          total: 1,
        })
        return
      case `GET ${apiBasePath}/system/dict/data`:
        await json(route, {
          code: 200,
          msg: 'ok',
          data: [
            {
              id: '4001',
              type_code: 'sys_common_status',
              label: '成功',
              value: '1',
              sort: 1,
              status: '1',
            },
          ],
        })
        return
      case `GET ${apiBasePath}/system/configs/key/sys.index.sideTheme`:
        await json(route, { code: 200, msg: 'ok', data: 'theme-light' })
        return
      case `GET ${apiBasePath}/system/configs/key/sys.index.skinName`:
        await json(route, { code: 200, msg: 'ok', data: 'blue' })
        return
      case `GET ${apiBasePath}/tools/gen/tables`:
        await json(route, {
          code: 200,
          msg: 'ok',
          rows: [{ table_name: 'sys_device', comment: '设备', columns: [{ name: 'id' }] }],
          total: 1,
        })
        return
      case `POST ${apiBasePath}/tools/gen/generate`:
        generationRequests.push(request.postDataJSON())
        await json(route, {
          code: 200,
          msg: 'ok',
          data: { written: ['src/entities/device.rs'], skipped: [] },
        })
        return
      default:
        unexpectedRequests.push(key)
        await json(route, { code: 500, msg: `unexpected request: ${key}` }, 500)
    }
  })

  return {
    unexpectedRequests,
    generationRequests,
    avatarDownloads,
    refreshAttempts,
    protectedUnauthorizedRequests,
    get refreshRequests() { return refreshRequests },
    get logoutRequests() { return logoutRequests },
    get refreshSessionActive() { return refreshSessionActive },
    expireAccessToken() {
      if (currentAccessToken) expiredAccessTokens.add(currentAccessToken)
    },
    revokeRefreshSession() {
      refreshSessionActive = false
      currentRefreshJti = null
    },
    queueRefreshConflict() { queuedRefreshConflicts += 1 },
    holdNextRefresh() {
      if (refreshGate) throw new Error('a refresh response is already held')
      refreshGate = createGate()
    },
    releaseRefresh() {
      refreshGate?.release()
    },
    setRefreshUnavailable(unavailable: boolean) { refreshUnavailable = unavailable },
  }
}

function collectRuntimeIssues(page: Page): string[] {
  const issues: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'warning' || message.type() === 'error') {
      if (message.text() === 'Failed to load resource: the server responded with a status of 401 (Unauthorized)') {
        return
      }
      issues.push(`console.${message.type()}: ${message.text()}`)
    }
  })
  page.on('pageerror', error => issues.push(`pageerror: ${error.message}`))
  return issues
}

async function login(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByPlaceholder('租户标识').fill('system')
  await page.getByPlaceholder('用户名').fill('operator')
  await page.getByPlaceholder('密码').fill('Strong@123')
  await Promise.all([
    page.waitForURL('**/index'),
    page.getByRole('button', { name: '登录', exact: true }).click(),
  ])
  await expect(page.getByRole('heading', { name: '你好，测试用户' })).toBeVisible()
}

async function requestCurrentUser(page: Page, label: string): Promise<number> {
  return page.evaluate(async (probeLabel) => {
    const moduleUrl = '/src/shared/http/client.ts'
    const http = await import(moduleUrl) as {
      request(config: Record<string, unknown>): Promise<{ code: number }>
    }
    const response = await http.request({
      url: '/auth/me',
      method: 'get',
      headers: { 'X-E2E-Probe': probeLabel },
    })
    return response.code
  }, label)
}

async function requestCurrentUserOutcome(
  page: Page,
  label: string,
): Promise<{ ok: boolean; status?: number }> {
  return page.evaluate(async (probeLabel) => {
    const moduleUrl = '/src/shared/http/client.ts'
    const http = await import(moduleUrl) as {
      request(config: Record<string, unknown>): Promise<unknown>
    }
    try {
      await http.request({
        url: '/auth/me',
        method: 'get',
        headers: { 'X-E2E-Probe': probeLabel },
      })
      return { ok: true }
    }
    catch (error) {
      const status = typeof error === 'object' && error !== null && 'status' in error
        ? Number(error.status)
        : undefined
      return { ok: false, status: Number.isFinite(status) ? status : undefined }
    }
  }, label)
}

async function startCurrentUserRequest(page: Page, label: string): Promise<void> {
  await page.evaluate((probeLabel) => {
    const scope = window as typeof window & {
      __ryframeE2eRequest?: { done: boolean; ok: boolean; status?: number }
    }
    scope.__ryframeE2eRequest = { done: false, ok: false }
    const moduleUrl = '/src/shared/http/client.ts'
    void (async () => {
      const http = await import(moduleUrl) as {
        request(config: Record<string, unknown>): Promise<unknown>
      }
      await http.request({
        url: '/auth/me',
        method: 'get',
        headers: { 'X-E2E-Probe': probeLabel },
      })
    })().then(
      () => { scope.__ryframeE2eRequest = { done: true, ok: true } },
      (error: unknown) => {
        const status = typeof error === 'object' && error !== null && 'status' in error
          ? Number(error.status)
          : undefined
        scope.__ryframeE2eRequest = {
          done: true,
          ok: false,
          status: Number.isFinite(status) ? status : undefined,
        }
      },
    )
  }, label)
}

async function backgroundRequestOutcome(page: Page) {
  return page.evaluate(() => {
    const scope = window as typeof window & {
      __ryframeE2eRequest?: { done: boolean; ok: boolean; status?: number }
    }
    return scope.__ryframeE2eRequest ?? { done: false, ok: false }
  })
}

async function sessionSnapshot(page: Page) {
  return page.evaluate(async () => {
    const moduleUrl = '/src/stores/user.ts'
    const stores = await import(moduleUrl) as {
      useUserStore(): { token: string; sessionStatus: string }
    }
    const user = stores.useUserStore()
    return { token: user.token, status: user.sessionStatus }
  })
}

async function observeRemoteRefreshStart(page: Page): Promise<void> {
  await page.evaluate(() => {
    const scope = window as typeof window & { __ryframeE2eSawRefreshStart?: boolean }
    scope.__ryframeE2eSawRefreshStart = false
    const observer = new BroadcastChannel('ryframe-auth-v0.5')
    observer.addEventListener('message', (event) => {
      if (event.data?.type === 'refresh-start') scope.__ryframeE2eSawRefreshStart = true
    })
  })
}

async function sawRemoteRefreshStart(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const scope = window as typeof window & { __ryframeE2eSawRefreshStart?: boolean }
    return scope.__ryframeE2eSawRefreshStart === true
  })
}

test('expired access can logout, delete its cookie and stay warning-free', async ({ page }) => {
  const state = await installApiMocks(page)
  const runtimeIssues = collectRuntimeIssues(page)

  await login(page)
  await page.getByRole('button', { name: '字典管理', exact: true }).click()
  await expect(page).toHaveURL(/\/system\/dict$/)
  await expect(page.getByText('登录状态', { exact: true })).toBeVisible()

  await page.getByText('登录状态', { exact: true }).click()
  await expect(page.getByText('字典数据 — 登录状态', { exact: true })).toBeVisible()
  await expect(page.getByText('成功', { exact: true })).toBeVisible()

  await page.goto('/platform/tenants')
  await expect(page).toHaveURL(/\/403$/)
  await expect(page.getByRole('heading', { name: '403' })).toBeVisible()

  await page.goto('/index')
  const userMenu = page.getByText('测试用户', { exact: true })
  await expect(userMenu).toBeVisible()
  const refreshCookieBeforeLogout = (await page.context().cookies())
    .find(cookie => cookie.name === 'ryframe_refresh_token')
  expect(refreshCookieBeforeLogout?.value).toMatch(/^refresh-jti-\d+$/)
  state.expireAccessToken()
  await userMenu.click()
  await page.getByText('退出登录', { exact: true }).click()
  await page.getByRole('button', { name: '确定', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)

  await expect.poll(async () => (await page.context().cookies())
    .some(cookie => cookie.name === 'ryframe_refresh_token')).toBe(false)
  await expect.poll(() => sessionSnapshot(page)).toEqual({ token: '', status: 'anonymous' })

  expect(state.logoutRequests).toBe(1)
  expect(state.refreshSessionActive).toBe(false)
  expect(state.unexpectedRequests).toEqual([])
  expect(runtimeIssues).toEqual([])
})

test('refresh cookie restores a reloaded tab without persisting bearer tokens', async ({ page }) => {
  const state = await installApiMocks(page)
  const runtimeIssues = collectRuntimeIssues(page)

  await login(page)
  await expect.poll(async () => page.evaluate(() => ({
    access: localStorage.getItem('ryframe_token'),
    refresh: localStorage.getItem('ryframe_refresh_token'),
  }))).toEqual({ access: null, refresh: null })

  await page.reload()
  await expect(page.locator('h1')).toContainText('测试用户')
  expect(state.refreshRequests).toBeGreaterThanOrEqual(2)

  const cookies = await page.context().cookies()
  const refreshCookie = cookies.find(cookie => cookie.name === 'ryframe_refresh_token')
  expect(refreshCookie?.httpOnly).toBe(true)
  expect(state.unexpectedRequests).toEqual([])
  expect(runtimeIssues).toEqual([])
})

test('a refresh dependency outage keeps the HttpOnly cookie and shows unavailable state', async ({ page }) => {
  const state = await installApiMocks(page)
  const runtimeIssues = collectRuntimeIssues(page)

  await login(page)
  const cookieBefore = (await page.context().cookies())
    .find(cookie => cookie.name === 'ryframe_refresh_token')
  expect(cookieBefore?.value).toBeTruthy()

  state.setRefreshUnavailable(true)
  await page.reload()
  await expect(page).toHaveURL(/\/500$/)
  await expect(page.getByRole('heading', { name: '503' })).toBeVisible()

  const cookieAfter = (await page.context().cookies())
    .find(cookie => cookie.name === 'ryframe_refresh_token')
  expect(cookieAfter?.value).toBe(cookieBefore?.value)
  expect(state.refreshRequests).toBeGreaterThanOrEqual(2)
  expect(state.logoutRequests).toBe(0)
  expect(state.unexpectedRequests).toEqual([])
  expect(runtimeIssues.filter(issue => !issue.includes('503'))).toEqual([])
})

test('two concurrent 401 responses share one in-tab refresh and replay once', async ({ page }) => {
  const state = await installApiMocks(page)
  const runtimeIssues = collectRuntimeIssues(page)

  await login(page)
  const refreshBaseline = state.refreshRequests
  state.expireAccessToken()
  state.holdNextRefresh()

  const requests = Promise.all([
    requestCurrentUser(page, 'single-flight-one'),
    requestCurrentUser(page, 'single-flight-two'),
  ])
  try {
    await expect.poll(() => state.protectedUnauthorizedRequests
      .filter(label => label.startsWith('single-flight-')).length).toBe(2)
    await expect.poll(() => state.refreshRequests).toBe(refreshBaseline + 1)
  }
  finally {
    state.releaseRefresh()
  }

  await expect(requests).resolves.toEqual([200, 200])
  expect(state.refreshRequests).toBe(refreshBaseline + 1)
  expect(state.refreshAttempts.slice(refreshBaseline).map(attempt => attempt.status)).toEqual([200])
  expect(state.unexpectedRequests).toEqual([])
  expect(runtimeIssues).toEqual([])
})

test('a 409 refresh conflict honors Retry-After and retries exactly once', async ({ page }) => {
  const state = await installApiMocks(page)
  const runtimeIssues = collectRuntimeIssues(page)

  await login(page)
  const refreshBaseline = state.refreshRequests
  const cookieBefore = (await page.context().cookies())
    .find(cookie => cookie.name === 'ryframe_refresh_token')
  state.expireAccessToken()
  state.queueRefreshConflict()

  await expect(requestCurrentUser(page, 'retry-after')).resolves.toBe(200)

  const attempts = state.refreshAttempts.slice(refreshBaseline)
  expect(attempts.map(attempt => attempt.status)).toEqual([409, 200])
  expect(attempts[0]?.cookieJti).toBe(cookieBefore?.value)
  expect(attempts[1]?.cookieJti).toBe(cookieBefore?.value)
  expect(attempts[0]?.csrfToken).not.toBe(attempts[1]?.csrfToken)
  expect(state.refreshRequests).toBe(refreshBaseline + 2)
  const cookieAfter = (await page.context().cookies())
    .find(cookie => cookie.name === 'ryframe_refresh_token')
  expect(cookieAfter?.value).not.toBe(cookieBefore?.value)
  expect(state.unexpectedRequests).toEqual([])
  expect(runtimeIssues.filter(issue => !issue.includes('409'))).toEqual([])
})

test('two real tabs coordinate an expired access token through one refresh', async ({ page, context }) => {
  const state = await installApiMocks(page)
  const firstTabIssues = collectRuntimeIssues(page)

  await login(page)
  const secondTab = await context.newPage()
  const secondTabIssues = collectRuntimeIssues(secondTab)
  await secondTab.goto('/index')
  await expect(secondTab.getByRole('heading', { name: '你好，测试用户' })).toBeVisible()
  await observeRemoteRefreshStart(secondTab)

  const refreshBaseline = state.refreshRequests
  state.expireAccessToken()
  state.holdNextRefresh()
  const firstRequest = requestCurrentUser(page, 'tab-one')
  let secondRequest: Promise<number> | undefined
  try {
    await expect.poll(() => state.refreshRequests).toBe(refreshBaseline + 1)
    await expect.poll(() => sawRemoteRefreshStart(secondTab)).toBe(true)

    secondRequest = requestCurrentUser(secondTab, 'tab-two')
    await expect.poll(() => state.protectedUnauthorizedRequests
      .filter(label => label === 'tab-one' || label === 'tab-two').length).toBe(2)
    expect(state.refreshRequests).toBe(refreshBaseline + 1)
  }
  finally {
    state.releaseRefresh()
  }

  await expect(Promise.all([firstRequest, secondRequest!])).resolves.toEqual([200, 200])
  expect(state.refreshRequests).toBe(refreshBaseline + 1)
  await expect.poll(() => sessionSnapshot(secondTab)).toMatchObject({
    status: 'authenticated',
  })
  expect(state.unexpectedRequests).toEqual([])
  expect(firstTabIssues).toEqual([])
  expect(secondTabIssues).toEqual([])
})

test('expired access with a rejected refresh ends in logged-out anonymous state', async ({ page }) => {
  const state = await installApiMocks(page)
  const runtimeIssues = collectRuntimeIssues(page)

  await login(page)
  const refreshBaseline = state.refreshRequests
  state.expireAccessToken()
  state.revokeRefreshSession()

  await expect(requestCurrentUserOutcome(page, 'expired-session'))
    .resolves.toEqual({ ok: false, status: 401 })
  await expect(page).toHaveURL(/\/login$/)
  await expect.poll(() => sessionSnapshot(page)).toEqual({ token: '', status: 'anonymous' })
  await expect.poll(async () => (await page.context().cookies())
    .some(cookie => cookie.name === 'ryframe_refresh_token')).toBe(false)

  expect(state.refreshRequests).toBe(refreshBaseline + 1)
  expect(state.logoutRequests).toBe(0)
  expect(state.unexpectedRequests).toEqual([])
  expect(runtimeIssues).toEqual([])
})

test('logout wins a refresh race and a rotated cookie cannot resurrect the session', async ({ page }) => {
  const state = await installApiMocks(page)
  const runtimeIssues = collectRuntimeIssues(page)

  await login(page)
  const refreshBaseline = state.refreshRequests
  state.expireAccessToken()
  state.holdNextRefresh()
  await startCurrentUserRequest(page, 'refresh-logout-race')

  try {
    await expect.poll(() => state.refreshRequests).toBe(refreshBaseline + 1)
    await page.getByText('测试用户', { exact: true }).click()
    await page.getByText('退出登录', { exact: true }).click()
    await page.getByRole('button', { name: '确定', exact: true }).click()
    await expect.poll(() => sessionSnapshot(page)).toEqual({ token: '', status: 'anonymous' })
  }
  finally {
    state.releaseRefresh()
  }

  await expect.poll(() => backgroundRequestOutcome(page)).toEqual({
    done: true,
    ok: false,
    status: 401,
  })
  await expect.poll(() => state.logoutRequests).toBe(1)
  await expect(page).toHaveURL(/\/login$/)
  await expect.poll(() => sessionSnapshot(page)).toEqual({ token: '', status: 'anonymous' })
  await expect.poll(async () => (await page.context().cookies())
    .some(cookie => cookie.name === 'ryframe_refresh_token')).toBe(false)

  expect(state.refreshAttempts.slice(refreshBaseline).map(attempt => attempt.status)).toEqual([200])
  expect(state.refreshSessionActive).toBe(false)
  expect(state.unexpectedRequests).toEqual([])
  expect(runtimeIssues).toEqual([])
})

test('code generation requires an external output path before submitting', async ({ page }) => {
  const { unexpectedRequests, generationRequests } = await installApiMocks(page)
  const runtimeIssues = collectRuntimeIssues(page)

  await login(page)
  await page.goto('/tools/gen')
  await expect(page.getByText('sys_device', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: '生成', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '生成代码' })
  await expect(dialog).toBeVisible()
  expect(generationRequests).toEqual([])

  await dialog.getByRole('button', { name: '生成', exact: true }).click()
  await expect(dialog.getByText('请输入服务端输出目录', { exact: true })).toBeVisible()
  expect(generationRequests).toEqual([])

  const outputDir = String.raw`D:\generated\ryframe-device`
  await dialog.getByPlaceholder('请输入绝对路径').fill(outputDir)
  await dialog.getByRole('button', { name: '生成', exact: true }).click()

  await expect(page.getByText('已写入 1 个文件', { exact: true })).toBeVisible()
  await expect(dialog).toBeHidden()
  expect(generationRequests).toEqual([
    {
      output_dir: outputDir,
      options: { tables: ['sys_device'] },
    },
  ])
  expect(unexpectedRequests).toEqual([])
  expect(runtimeIssues).toEqual([])
})

test('avatar upload refreshes every private image through authenticated downloads', async ({ page }) => {
  const { avatarDownloads, unexpectedRequests } = await installApiMocks(page)
  const runtimeIssues = collectRuntimeIssues(page)

  await login(page)
  await page.goto('/profile')

  const profileAvatar = page.locator('.avatar-preview img')
  const navbarAvatar = page.locator('.navbar .el-avatar img')
  await expect(profileAvatar).toHaveAttribute('src', /^blob:/)
  await expect(navbarAvatar).toHaveAttribute('src', /^blob:/)
  const oldProfileSrc = await profileAvatar.getAttribute('src')
  const downloadsBeforeUpload = avatarDownloads.length

  await page.locator('.avatar-uploader input[type="file"]').setInputFiles({
    name: 'new-avatar.png',
    mimeType: 'image/png',
    buffer: avatarPng,
  })

  await expect(page.getByText('头像更新成功', { exact: true })).toBeVisible()
  await expect.poll(() => profileAvatar.getAttribute('src')).not.toBe(oldProfileSrc)
  await expect(profileAvatar).toHaveAttribute('src', /^blob:/)
  await expect(navbarAvatar).toHaveAttribute('src', /^blob:/)
  await expect.poll(
    () => avatarDownloads.slice(downloadsBeforeUpload)
      .filter(download => download.path?.endsWith('/new-avatar.png')).length,
  ).toBeGreaterThanOrEqual(2)

  expect(avatarDownloads).not.toHaveLength(0)
  expect(avatarDownloads.every(download => (
    download.bucket === 'avatar'
    && /^Bearer access-token-\d+$/.test(download.authorization ?? '')
    && download.tenantId === 'system'
  ))).toBe(true)
  expect(unexpectedRequests).toEqual([])
  expect(runtimeIssues).toEqual([])
})

test('profile and dictionary layouts stack without mobile overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const { unexpectedRequests } = await installApiMocks(page)
  const runtimeIssues = collectRuntimeIssues(page)

  await login(page)
  await page.goto('/profile')
  await expect(page.getByText('基本信息', { exact: true })).toBeVisible()

  const profileLayout = await page.evaluate(() => {
    const root = document.documentElement
    const layout = document.querySelector('.profile-layout')
    const first = layout?.children.item(0)?.getBoundingClientRect()
    const second = layout?.children.item(1)?.getBoundingClientRect()
    return {
      horizontalOverflow: root.scrollWidth > innerWidth + 1,
      stacked: Boolean(first && second && second.top >= first.bottom),
    }
  })
  expect(profileLayout).toEqual({ horizontalOverflow: false, stacked: true })

  await page.goto('/system/dict')
  await expect(page.getByText('登录状态', { exact: true })).toBeVisible()
  const dictionaryLayout = await page.evaluate(() => {
    const root = document.documentElement
    const layout = document.querySelector('.dict-layout')
    const first = layout?.children.item(0)?.getBoundingClientRect()
    const second = layout?.children.item(1)?.getBoundingClientRect()
    return {
      horizontalOverflow: root.scrollWidth > innerWidth + 1,
      stacked: Boolean(first && second && second.top >= first.bottom),
    }
  })
  expect(dictionaryLayout).toEqual({ horizontalOverflow: false, stacked: true })

  expect(unexpectedRequests).toEqual([])
  expect(runtimeIssues).toEqual([])
})

test('runtime topology exposes RustFS without mobile overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const { unexpectedRequests } = await installApiMocks(page)
  const runtimeIssues = collectRuntimeIssues(page)

  await login(page)
  await page.goto('/monitor/runtime')

  await expect(page.getByRole('heading', { name: '数据库拓扑' })).toBeVisible()
  await expect(page.getByText('主库读取', { exact: true })).toBeVisible()
  await expect(page.getByText('RUSTFS', { exact: true })).toBeVisible()
  await expect(page.getByText('http://127.0.0.1:9000', { exact: true })).toBeVisible()

  const layout = await page.evaluate(() => ({
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    nodeRows: document.querySelectorAll('.topology-section .el-table__row').length,
  }))
  expect(layout).toEqual({ horizontalOverflow: false, nodeRows: 1 })
  expect(unexpectedRequests).toEqual([])
  expect(runtimeIssues).toEqual([])
})
