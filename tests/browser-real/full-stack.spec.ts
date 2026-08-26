import { expect, test, type Page, type Response } from '@playwright/test'
import { expectNoSeriousAccessibilityViolations } from '../browser/support/accessibility'
import { expectCleanDiagnostics, observeDiagnostics } from '../browser/support/diagnostics'

const credentials = {
  tenantId: process.env.RYFRAME_E2E_TENANT_ID?.trim() || 'system',
  username: process.env.RYFRAME_E2E_USERNAME?.trim() || 'admin',
  password: process.env.RYFRAME_E2E_PASSWORD || 'Valid!Admin123',
  captchaCode: process.env.RYFRAME_E2E_CAPTCHA_CODE?.trim(),
}

function waitForApiResponse(page: Page, method: string, pathname: string): Promise<Response> {
  return page.waitForResponse((response) => {
    const request = response.request()
    return request.method() === method && new URL(response.url()).pathname === pathname
  })
}

async function expectSuccessfulResponse(response: Response): Promise<void> {
  expect(response.ok(), `${response.status()} ${new URL(response.url()).pathname}`).toBe(true)
}

async function login(page: Page): Promise<void> {
  const captchaConfigResponse = waitForApiResponse(page, 'GET', '/api/v1/auth/captcha/config')
  await page.goto('/login')
  await expectSuccessfulResponse(await captchaConfigResponse)
  await expect(page.getByRole('heading', { name: 'RyFrame' })).toBeVisible()
  await expectNoSeriousAccessibilityViolations(page, '真实登录页')

  const tenantInput = page.getByPlaceholder('租户标识')
  if (await tenantInput.isVisible()) {
    const currentTenantId = await tenantInput.inputValue()
    if (currentTenantId !== credentials.tenantId) {
      const tenantCaptchaConfigResponse = waitForApiResponse(
        page,
        'GET',
        '/api/v1/auth/captcha/config',
      )
      await tenantInput.fill(credentials.tenantId)
      await tenantInput.press('Tab')
      await expectSuccessfulResponse(await tenantCaptchaConfigResponse)
    }
  }
  await page.getByPlaceholder('用户名').fill(credentials.username)
  await page.getByPlaceholder('密码').fill(credentials.password)

  const captchaInput = page.getByPlaceholder('验证码')
  if (await captchaInput.isVisible()) {
    expect(
      credentials.captchaCode,
      '真实环境启用了验证码，请设置 RYFRAME_E2E_CAPTCHA_CODE',
    ).toBeTruthy()
    await captchaInput.fill(credentials.captchaCode ?? '')
  }

  const loginResponsePromise = waitForApiResponse(page, 'POST', '/api/v1/auth/login')
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expectSuccessfulResponse(await loginResponsePromise)
  await expect(page).toHaveURL(/\/index$/u)
  await page.waitForLoadState('networkidle')
}

test('真实后端完成登录、首页、岗位与租户基本流程', async ({ page }) => {
  const diagnostics = observeDiagnostics(page)
  const authenticatedRefreshFailures: string[] = []
  let authenticated = false

  page.on('response', (response) => {
    if (!authenticated || response.status() < 400) return
    const url = new URL(response.url())
    if (url.pathname === '/api/v1/auth/refresh') {
      authenticatedRefreshFailures.push(`${response.status()} ${url.pathname}`)
    }
  })

  await login(page)
  authenticated = true
  await expect(page.locator('main.workspace')).toBeVisible()
  await expect(page.getByText('已登录', { exact: true })).toBeVisible()
  await expectNoSeriousAccessibilityViolations(page, '真实首页')

  const postListResponse = waitForApiResponse(page, 'GET', '/api/v1/system/posts')
  await page.goto('/system/post')
  await expectSuccessfulResponse(await postListResponse)
  await page.waitForLoadState('networkidle')
  await expect(page.locator('.content-card .card-header')).toContainText('岗位')
  await expectNoSeriousAccessibilityViolations(page, '真实岗位管理页')

  const postSearchResponse = waitForApiResponse(page, 'GET', '/api/v1/system/posts')
  await page.locator('.search-card').getByRole('button', { name: '搜索', exact: true }).click()
  await expectSuccessfulResponse(await postSearchResponse)

  const tenantListResponse = waitForApiResponse(page, 'GET', '/api/v1/platform/tenants/page')
  await page.goto('/platform/tenants')
  await expectSuccessfulResponse(await tenantListResponse)
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: '租户容量管理' })).toBeVisible()
  await expectNoSeriousAccessibilityViolations(page, '真实租户容量页')

  const tenantSearchResponse = waitForApiResponse(page, 'GET', '/api/v1/platform/tenants/page')
  await page.locator('.filter-card').getByRole('button', { name: '查询', exact: true }).click()
  await expectSuccessfulResponse(await tenantSearchResponse)

  expect(authenticatedRefreshFailures).toEqual([])
  await expectCleanDiagnostics(page, diagnostics)
})
