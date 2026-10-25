import { expect, type Page } from '@playwright/test'
import { test } from './session-fixture'
import { act, credentials, login } from './support'
import { createOrdinaryUser, createWriterRole, openIdentityPage } from './session-identities'
import { submitPasswordLogin } from './password-lifecycle-support'
import { observeSession } from './session-observation'
import { expectCleanDiagnostics, observeDiagnostics } from '../browser/support/diagnostics'
import { loadRealBrowserEnvironment } from '../../scripts/real-browser-environment.mjs'

async function requestReset(admin: Page, username: string, userId: string): Promise<URL> {
  await openIdentityPage(admin, 'user')
  await admin.locator('.search-card').getByPlaceholder('请输入用户名').fill(username)
  const listed = await act(admin, 'GET', '/api/v1/system/users', () =>
    admin.locator('.search-card').getByRole('button', { name: '搜索', exact: true }).click(),
  )
  expect(await listed.json()).toMatchObject({ data: { total: 1, items: [{ id: userId }] } })
  const row = admin.locator('.el-table__body tr').filter({ hasText: username })
  await expect(row).toHaveCount(1)
  await row.getByRole('button', { name: '发起重置', exact: true }).click()
  const dialog = admin.getByRole('dialog', { name: '发起密码重置', exact: true })
  await dialog.getByPlaceholder('请输入发起密码重置的原因').fill('隔离身份生命周期验收')
  const response = await act(
    admin,
    'POST',
    `/api/v1/system/users/${userId}/password-reset-requests`,
    () => dialog.getByRole('button', { name: '发起', exact: true }).click(),
  )
  const value: unknown = (await response.json()).data.reset_url
  expect(typeof value).toBe('string')
  if (typeof value !== 'string') throw new Error('密码重置响应缺少链接')
  const url = new URL(value, admin.url())
  expect(url.origin).toBe(new URL(admin.url()).origin)
  expect(url.pathname).toBe('/reset-password')
  expect(url.search).toBe('')
  expect(url.username).toBe('')
  expect(url.password).toBe('')
  const fragment = new URLSearchParams(url.hash.slice(1))
  expect([...fragment.keys()].sort()).toEqual(['request_id', 'tenant_id', 'token'])
  expect(fragment.get('tenant_id')).toBe(credentials.tenantId)
  expect(Boolean(fragment.get('request_id') && fragment.get('token'))).toBe(true)
  await dialog.getByRole('button', { name: '取消', exact: true }).click()
  return url
}

test('真实普通账号首次改密、管理员重置与旧凭据会话失效', async ({
  page: admin,
  clientAddress,
  sessionResources,
}) => {
  // 六次登录共用固定客户和账本；低容量配置按真实窗口等待，不改变限流。
  const environment = loadRealBrowserEnvironment()
  test.setTimeout(
    300_000 + (environment.loginWindowSeconds + environment.requestWindowSeconds) * 1000 * 6,
  )
  const adminDiagnostics = observeSession(admin)
  await sessionResources.budget.beforeProvisioning()
  await login(admin)
  const role = await createWriterRole(admin, adminDiagnostics, sessionResources.resources)
  const preparation = await sessionResources.newContext(clientAddress)
  const identity = await createOrdinaryUser(
    admin,
    preparation,
    role,
    sessionResources.resources,
    sessionResources.budget,
  )
  const owned = sessionResources.resources
    .snapshot()
    .resources.find((resource) => resource.kind === 'user' && resource.name === identity.username)
  if (!owned?.id || owned.phase !== 'created') throw new Error('缺少本次新建用户的 ownership')
  const context = await sessionResources.newContext(clientAddress)
  const page = await context.newPage()
  const diagnostics = observeDiagnostics(page)
  const budget = sessionResources.budget
  budget.observePage(page)

  await submitPasswordLogin(page, { ...identity, password: '123456' }, 401)
  await expect(page).toHaveURL(/\/login$/u)
  expect(diagnostics.httpErrors).toEqual(['401 /api/v1/auth/login'])
  diagnostics.httpErrors.length = 0
  await budget.beforePageBootstrap()
  const authenticated = await submitPasswordLogin(page, identity)
  const previousSession = (await authenticated.json()).data
  expect(previousSession.session_context.password_change_required).toBe(false)
  expect(previousSession.session_context.user).toMatchObject({
    id: owned.id,
    username: identity.username,
    tenant_id: identity.tenantId,
  })
  expect(typeof previousSession.access_token).toBe('string')
  expect(previousSession.access_token.length).toBeGreaterThan(0)
  await expect(page).toHaveURL(/\/index$/u)
  await expect(page.locator('.navbar .user-info')).toContainText(identity.username)
  await page.waitForLoadState('networkidle')

  await sessionResources.budget.beforeProvisioning()
  const resetUrl = await requestReset(admin, identity.username, owned.id)
  const resetContext = await sessionResources.newContext(clientAddress)
  const resetPage = await resetContext.newPage()
  const resetDiagnostics = observeSession(resetPage)
  budget.observePage(resetPage)
  await budget.beforePageBootstrap()
  await resetPage.goto(resetUrl.href)
  // 在填写密码前检查原页面已消费片段；HTTP URL 不应携带一次性凭据。
  await expect(resetPage).toHaveURL(`${resetUrl.origin}/reset-password`)
  await expect(resetPage.locator('.auth-form')).toBeVisible()
  const resetPassword = 'Valid!ResetSession123'
  await resetPage.locator('.auth-form input').nth(0).fill(resetPassword)
  await resetPage.locator('.auth-form input').nth(1).fill(resetPassword)
  await act(resetPage, 'POST', '/api/v1/auth/password-reset/complete', () =>
    resetPage.locator('.auth-form .submit-button').click(),
  )
  await expect(resetPage).toHaveURL(/\/login$/u)
  await resetPage.waitForLoadState('networkidle')
  await resetDiagnostics.verify()

  await budget.beforePageBootstrap()
  const staleStatus = await page.evaluate(
    async ({ token, tenant }) => {
      const response = await fetch('/api/v1/auth/context', {
        credentials: 'omit',
        headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Id': tenant },
      })
      return response.status
    },
    { token: previousSession.access_token, tenant: identity.tenantId },
  )
  expect(staleStatus).toBe(401)
  expect(diagnostics.httpErrors).toEqual(['401 /api/v1/auth/context'])
  diagnostics.httpErrors.length = 0
  const refreshed = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/v1/auth/refresh',
  )
  await page.reload()
  expect((await refreshed).status()).toBe(401)
  await expect(page).toHaveURL(/\/login(?:\?|$)/u)
  await expect(page.locator('main.workspace')).toHaveCount(0)

  await budget.beforePageBootstrap()
  await submitPasswordLogin(page, identity, 401)
  expect(diagnostics.httpErrors).toEqual(['401 /api/v1/auth/login'])
  diagnostics.httpErrors.length = 0
  await budget.beforePageBootstrap()
  const restored = await submitPasswordLogin(page, { ...identity, password: resetPassword })
  expect((await restored.json()).data.session_context).toMatchObject({
    password_change_required: false,
    user: { id: owned.id, username: identity.username, tenant_id: identity.tenantId },
  })
  await expect(page).toHaveURL(/\/index$/u)
  await expect(page.locator('.navbar .user-info')).toContainText(identity.username)
  await page.waitForLoadState('networkidle')
  await expectCleanDiagnostics(page, diagnostics)
  await adminDiagnostics.verify()
})
