import { expect, type Page, type Response } from '@playwright/test'
import { expectNoSeriousAccessibilityViolations } from '../browser/support/accessibility'
import { randomUUID } from 'node:crypto'
import { configuredLoginBudget } from '../../scripts/browser-login-budget.mjs'
import { isResourceScopeId } from '../../scripts/resource-scope.mjs'
import { clientAddress } from './client-address'

export function isolatedName(prefix: string): string {
  const scope = process.env.RYFRAME_E2E_SCOPE_ID || process.env.APP_SCOPE_ID
  if (!isResourceScopeId(scope)) {
    throw new Error('业务写入验收必须显式设置隔离环境的 RYFRAME_E2E_SCOPE_ID')
  }
  return `${prefix}-${randomUUID().slice(0, 8)}`
}

export async function act(
  page: Page,
  method: string,
  path: string | RegExp,
  action: () => Promise<unknown>,
): Promise<Response> {
  const response = page.waitForResponse((value) => {
    const pathname = new URL(value.url()).pathname
    return (
      value.request().method() === method &&
      (typeof path === 'string' ? pathname === path : path.test(pathname))
    )
  })
  const [result] = await Promise.all([response, action()])
  await expectSuccessfulResponse(result)
  return result
}

export const credentials = {
  tenantId: process.env.RYFRAME_E2E_TENANT_ID?.trim() || 'system',
  username: process.env.RYFRAME_E2E_USERNAME?.trim() || 'admin',
  password: process.env.RYFRAME_E2E_PASSWORD || 'Valid!Admin123',
  captchaCode: process.env.RYFRAME_E2E_CAPTCHA_CODE?.trim(),
}

export function waitForApiResponse(
  page: Page,
  method: string,
  pathname: string,
): Promise<Response> {
  return page.waitForResponse((response) => {
    const request = response.request()
    return request.method() === method && new URL(response.url()).pathname === pathname
  })
}

export async function expectSuccessfulResponse(response: Response): Promise<void> {
  expect(response.ok(), `${response.status()} ${new URL(response.url()).pathname}`).toBe(true)
}

export async function submitLogin(page: Page, identity = credentials): Promise<Response> {
  const budget = configuredLoginBudget()
  const reservation = await budget.reserve(identity, clientAddress(page.context()))
  try {
    return await act(page, 'POST', '/api/v1/auth/login', () =>
      page.getByRole('button', { name: '登录', exact: true }).click(),
    )
  } finally {
    await budget.complete(reservation)
  }
}

export async function login(page: Page, identity = credentials): Promise<void> {
  const captchaConfigResponse = waitForApiResponse(page, 'GET', '/api/v1/auth/captcha/config')
  await page.goto('/login')
  await expectSuccessfulResponse(await captchaConfigResponse)
  await expect(page.getByRole('heading', { name: 'RyFrame' })).toBeVisible()
  await expectNoSeriousAccessibilityViolations(page, '真实登录页')

  const tenantInput = page.getByPlaceholder('租户标识')
  if (await tenantInput.isVisible()) {
    const currentTenantId = await tenantInput.inputValue()
    if (currentTenantId !== identity.tenantId) {
      const tenantCaptchaConfigResponse = waitForApiResponse(
        page,
        'GET',
        '/api/v1/auth/captcha/config',
      )
      await tenantInput.fill(identity.tenantId)
      await tenantInput.press('Tab')
      await expectSuccessfulResponse(await tenantCaptchaConfigResponse)
    }
  }
  await page.getByPlaceholder('用户名').fill(identity.username)
  await page.getByPlaceholder('密码').fill(identity.password)

  const captchaInput = page.getByPlaceholder('验证码')
  if (await captchaInput.isVisible()) {
    expect(
      identity.captchaCode,
      '真实环境启用了验证码，请设置 RYFRAME_E2E_CAPTCHA_CODE',
    ).toBeTruthy()
    await captchaInput.fill(identity.captchaCode ?? '')
  }

  await submitLogin(page, identity)
  await expect(page).toHaveURL(/\/index$/u)
  await page.waitForLoadState('networkidle')
}
