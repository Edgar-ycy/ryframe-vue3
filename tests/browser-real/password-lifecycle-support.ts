import { expect, type BrowserContext, type Page } from '@playwright/test'
import { act, credentials, submitLogin } from './support'
import { selectLoginTenant } from './login-tenant'
import { observeSession } from './session-observation'
import { observeRequestBudget } from './request-budget'

type Identity = typeof credentials

/** 使用真实登录表单，成功和预期拒绝均经过同一共享限流预算。 */
export async function submitPasswordLogin(
  page: Page,
  identity: Identity,
  expectedStatus: 200 | 401 = 200,
) {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'RyFrame' })).toBeVisible()
  await selectLoginTenant(page, identity.tenantId)
  await page.getByPlaceholder('用户名').fill(identity.username)
  await page.getByPlaceholder('密码').fill(identity.password)
  const captcha = page.getByPlaceholder('验证码')
  if (await captcha.isVisible()) {
    expect(identity.captchaCode, '验证码启用时必须提供真实验证码').toBeTruthy()
    await captcha.fill(identity.captchaCode ?? '')
  }
  const response = await submitLogin(page, identity, expectedStatus)
  if (expectedStatus === 401) {
    await expect(page.getByRole('button', { name: '登录', exact: true })).toBeEnabled()
    await page.waitForLoadState('networkidle')
  }
  return response
}

/** 新账号必须真实使用初始密码登录，再通过受限页面改密。 */
export async function changeInitialPassword(
  context: BrowserContext,
  identity: Identity,
  sharedBudget?: ReturnType<typeof observeRequestBudget>,
) {
  const page = await context.newPage()
  const diagnostics = observeSession(page)
  const budget = sharedBudget ?? observeRequestBudget(page)
  budget.observePage(page)
  try {
    await budget.beforePageBootstrap()
    const response = await submitPasswordLogin(page, { ...identity, password: '123456' })
    const session = (await response.json()).data.session_context
    expect(session).toMatchObject({
      password_change_required: true,
      is_super_admin: false,
      roles: [],
      permissions: [],
      menus: [],
      capabilities: [],
      user: { username: identity.username, tenant_id: identity.tenantId },
    })
    await expect(page).toHaveURL(/\/change-password$/u)
    await expect(page.getByRole('heading', { name: '修改初始密码', exact: true })).toBeVisible()
    await expect(page.locator('main.workspace')).toHaveCount(0)
    await budget.beforePageBootstrap()
    await page.goto('/system/post')
    await expect(page).toHaveURL(/\/change-password$/u)
    await expect(page.locator('main.workspace')).toHaveCount(0)
    const form = page.locator('.auth-form')
    await form.getByLabel('旧密码', { exact: true }).fill('123456')
    await form.getByLabel('新密码', { exact: true }).fill(identity.password)
    await form.getByLabel('确认新密码', { exact: true }).fill(identity.password)
    await act(page, 'PUT', '/api/v1/auth/profile/password', () =>
      form.locator('.password-submit').click(),
    )
    await expect(page).toHaveURL(/\/login$/u)
    await expect(page.locator('main.workspace')).toHaveCount(0)
    await page.waitForLoadState('networkidle')
    await diagnostics.verify()
  } finally {
    await page.close()
  }
}
