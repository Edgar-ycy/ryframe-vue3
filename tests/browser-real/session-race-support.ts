import { selectLoginTenant } from './login-tenant'
import { expect, type BrowserContext, type Page } from '@playwright/test'
import { act, credentials, isolatedName, login, submitLogin } from './support'
import { createOrdinaryUser, createWriterRole, logout } from './session-identities'
import { observeSession } from './session-observation'
import type { SessionResources } from '../../scripts/browser-session-resources.mjs'

export async function prepareActors(
  admin: Page,
  newContext: (address: string) => Promise<BrowserContext>,
  address: string,
  resources: SessionResources,
) {
  const adminDiagnostics = observeSession(admin)
  await login(admin)
  const role = await createWriterRole(admin, adminDiagnostics, resources)
  const octets = address.split('.')
  octets[3] = String(Number(octets[3]) ^ 128)
  const activation = await newContext(octets.join('.'))
  const first = await createOrdinaryUser(admin, activation, role, resources)
  const second = await createOrdinaryUser(admin, activation, role, resources)
  const clientAddress = address.replace('198.18.', '198.19.')
  const context = await newContext(clientAddress)
  const page = await context.newPage()
  const diagnostics = observeSession(page)
  const loggedIn = page.waitForResponse(
    (value) =>
      new URL(value.url()).pathname === '/api/v1/auth/login' && value.request().method() === 'POST',
  )
  await login(page, first)
  const initial = (await (await loggedIn).json()).data.session_context
  expect(initial.is_super_admin).toBe(false)
  expect(initial.user.username).toBe(first.username)
  const tab = await context.newPage()
  const tabDiagnostics = observeSession(tab)
  await act(tab, 'POST', '/api/v1/auth/refresh', () => tab.goto('/index'))
  await expect(tab.locator('.navbar .user-info')).toContainText(first.username)
  await tab.waitForLoadState('networkidle')
  return {
    page,
    tab,
    context,
    first,
    second,
    role,
    clientAddress,
    initial,
    diagnostics,
    tabDiagnostics,
    adminDiagnostics,
  }
}

/** 保持原标签的 JavaScript 生命周期，用实际表单完成新身份登录。 */
export async function submitVisibleLogin(page: Page, identity = credentials) {
  await expect(page).toHaveURL(/\/login(?:\?|$)/u)
  await selectLoginTenant(page, identity.tenantId)
  await page.getByPlaceholder('用户名').fill(identity.username)
  await page.getByPlaceholder('密码').fill(identity.password)
  const captcha = page.getByPlaceholder('验证码')
  if (await captcha.isVisible()) {
    expect(identity.captchaCode).toBeTruthy()
    await captcha.fill(identity.captchaCode || '')
  }
  const response = await submitLogin(page, identity)
  const user = (await response.json()).data.session_context.user
  expect(user).toMatchObject({
    username: identity.username,
    tenant_id: identity.tenantId,
  })
  await expect(page).toHaveURL(/\/index$/u)
  await expect(page.locator('.navbar .user-info')).toContainText(user.nickname || user.username)
  await page.waitForLoadState('networkidle')
}

export async function switchViaOtherTab(tab: Page, page: Page, identity = credentials) {
  await logout(tab)
  await submitVisibleLogin(page, identity)
}

export async function postPage(page: Page) {
  const menu = page.getByRole('menuitem', { name: '岗位管理', exact: true })
  if (!(await menu.isVisible())) {
    await page.getByRole('menuitem', { name: '系统管理', exact: true }).click()
  }
  await act(page, 'GET', '/api/v1/system/posts', () => menu.click())
  await page.waitForLoadState('networkidle')
}

export async function fillNewPost(page: Page, name: string) {
  await page.locator('.card-header').getByRole('button', { name: '新增', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '新增岗位', exact: true })
  await dialog.getByPlaceholder('请输入岗位名称').fill(name)
  await dialog.getByPlaceholder('请输入岗位编码').fill(isolatedName('race-post'))
  return dialog.getByRole('button', { name: '确定', exact: true })
}

export async function searchPost(page: Page, name: string) {
  await page.getByPlaceholder('请输入或选择岗位名称').fill(name)
  await act(page, 'GET', '/api/v1/system/posts', () =>
    page.locator('.search-card').getByRole('button', { name: '搜索', exact: true }).click(),
  )
}

export async function deletePost(page: Page, name: string) {
  if (new URL(page.url()).pathname !== '/system/post') await postPage(page)
  await searchPost(page, name)
  const row = page.locator('.el-table__body tr').filter({ hasText: name })
  await expect(row).toHaveCount(1)
  await row.getByRole('button', { name: '删除', exact: true }).click()
  await act(page, 'DELETE', /\/system\/posts\/\d+$/u, () =>
    page.locator('.el-message-box').getByRole('button', { name: '确定', exact: true }).click(),
  )
  await expect(row).toHaveCount(0)
}
