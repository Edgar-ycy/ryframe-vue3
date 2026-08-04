import { expect, test, type Route } from '@playwright/test'

interface ApiRequestRecord {
  method: string
  url: URL
}

function json(route: Route, status: number, body: unknown): Promise<void> {
  return route.fulfill({
    status,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify(body),
  })
}

test('从 dist 加载深层路由并且只访问同源 API', async ({ page }) => {
  const baseURL = test.info().project.use.baseURL
  if (typeof baseURL !== 'string') throw new Error('生产构建烟测缺少 baseURL')

  const productionOrigin = new URL(baseURL).origin
  const browserRequests: string[] = []
  const apiRequests: ApiRequestRecord[] = []
  const unexpectedApiRequests: string[] = []
  const pageErrors: string[] = []

  page.on('request', request => browserRequests.push(request.url()))
  page.on('pageerror', error => pageErrors.push(error.message))

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    apiRequests.push({ method, url })

    if (method === 'GET' && url.pathname === '/api/v1/auth/csrf') {
      await json(route, 200, {
        code: 200,
        message: 'ok',
        data: { csrf_token: 'production-smoke-csrf', expires_in: 300 },
        request_id: 'production-smoke-request',
      })
      return
    }

    if (method === 'POST' && url.pathname === '/api/v1/auth/refresh') {
      await json(route, 401, {
        code: 401,
        message: 'anonymous session',
        request_id: 'production-smoke-request',
      })
      return
    }

    if (method === 'GET' && url.pathname === '/api/v1/auth/captcha/config') {
      await json(route, 200, {
        code: 200,
        message: 'ok',
        data: { captcha_enabled: false },
        request_id: 'production-smoke-request',
      })
      return
    }

    unexpectedApiRequests.push(`${method} ${url.pathname}`)
    await json(route, 500, {
      code: 500,
      message: 'unexpected production smoke request',
      request_id: 'production-smoke-request',
    })
  })

  const documentResponse = await page.goto('/login')
  expect(documentResponse?.status()).toBe(200)
  expect(await documentResponse?.headerValue('content-type')).toContain('text/html')
  await expect(page.locator('.login-card')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toHaveCount(1)

  await expect.poll(() => apiRequests.some(({ method, url }) => (
    method === 'GET' && url.pathname === '/api/v1/auth/csrf'
  ))).toBe(true)
  await expect.poll(() => apiRequests.some(({ method, url }) => (
    method === 'POST' && url.pathname === '/api/v1/auth/refresh'
  ))).toBe(true)
  await expect.poll(() => apiRequests.some(({ method, url }) => (
    method === 'GET' && url.pathname === '/api/v1/auth/captcha/config'
  ))).toBe(true)

  const moduleSources = await page.locator('script[type="module"][src]').evaluateAll(elements => (
    elements.map(element => element.getAttribute('src'))
  ))
  expect(moduleSources.length).toBeGreaterThan(0)
  expect(moduleSources.every(source => /^\/assets\/.+\.js$/u.test(source ?? ''))).toBe(true)

  const buildIdentityResponse = await page.request.get(`${productionOrigin}/build-identity.json`)
  expect(buildIdentityResponse.ok()).toBe(true)
  const buildIdentity = await buildIdentityResponse.json() as { frontend_commit?: unknown }
  expect(buildIdentity.frontend_commit).toEqual(expect.stringMatching(/^(?:development|[0-9a-f]{40})$/u))

  const sourceModuleRequests = browserRequests.filter((requestUrl) => {
    const pathname = new URL(requestUrl).pathname
    return pathname.startsWith('/src/') || pathname === '/@vite/client'
  })
  const crossOriginRequests = browserRequests.filter((requestUrl) => {
    const url = new URL(requestUrl)
    return ['http:', 'https:'].includes(url.protocol) && url.origin !== productionOrigin
  })

  expect(apiRequests.every(({ url }) => url.origin === productionOrigin)).toBe(true)
  expect(sourceModuleRequests).toEqual([])
  expect(crossOriginRequests).toEqual([])
  expect(unexpectedApiRequests).toEqual([])
  expect(pageErrors).toEqual([])
})
