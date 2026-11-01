import {
  expect,
  type BrowserContext,
  type Page,
  type Request,
  type Response,
} from '@playwright/test'
import {
  act,
  credentials,
  expectSuccessfulResponse,
  isolatedName,
  waitForApiResponse,
} from './support'
import { observeSession } from './session-observation'
import type { SessionResources } from '../../scripts/browser-session-resources.mjs'
import { createOwnedIdentity } from './session-resources'
import { changeInitialPassword } from './password-lifecycle-support'
import type { observeRequestBudget } from './request-budget'

export const writerPermissions = [
  'system:post:list',
  'system:post:add',
  'system:post:edit',
  'system:post:remove',
  'system:notice:list',
]

export async function openIdentityPage(page: Page, kind: 'role' | 'user') {
  if (new URL(page.url()).pathname === `/system/${kind}`) return
  const menu = page.getByRole('menuitem', {
    name: kind === 'role' ? '角色管理' : '用户管理',
    exact: true,
  })
  if (!(await menu.isVisible())) {
    await page.getByRole('menuitem', { name: '系统管理', exact: true }).click()
  }
  await act(page, 'GET', `/api/v1/system/${kind}s`, () => menu.click())
}

export async function setRolePermissions(
  page: Page,
  code: string,
  permissions: string[],
  diagnostics: ReturnType<typeof observeSession>,
) {
  await openIdentityPage(page, 'role')
  const filter = page.locator('.search-card').getByPlaceholder('请输入角色编码')
  if ((await filter.inputValue()) !== code) {
    await filter.fill(code)
    await page.locator('.search-card').getByRole('button', { name: '搜索', exact: true }).click()
  }
  const row = page.locator('.el-table__body tr').filter({ hasText: code })
  await expect(row).toHaveCount(1)
  const permissionsResponse = await act(page, 'GET', /\/system\/roles\/\d+\/permissions$/u, () =>
    row.getByRole('button', { name: '权限', exact: true }).click(),
  )
  const permissionsPath = new URL(permissionsResponse.url()).pathname
  const dialog = page.getByRole('dialog', { name: '分配权限', exact: true })
  const cascade = dialog.getByRole('checkbox', { name: '父子联动', exact: true })
  if (await cascade.isChecked()) await dialog.getByText('父子联动', { exact: true }).click()
  const all = dialog.getByRole('checkbox', { name: '全选/全不选', exact: true })
  if (!(await all.isChecked())) await dialog.getByText('全选/全不选', { exact: true }).click()
  await expect(all).toBeChecked()
  await dialog.getByText('全选/全不选', { exact: true }).click()
  await expect(all).not.toBeChecked()
  await dialog.getByText('展开/折叠', { exact: true }).click()
  for (const permission of permissions) {
    const node = dialog.locator('.el-tree-node__content').filter({
      has: page.getByText(permission, { exact: true }),
    })
    await node.locator('.el-checkbox').click()
    await expect(node.getByRole('checkbox')).toBeChecked()
  }
  const refreshed = page.waitForResponse(
    (value) =>
      value.request().method() === 'GET' &&
      new URL(value.url()).pathname === '/api/v1/auth/context',
  )
  let permissionsChanged = false
  let contextReceived = false
  const observeResponse = (response: Response) => {
    if (response.status() !== 200) return
    const method = response.request().method()
    const pathname = new URL(response.url()).pathname
    if (method === 'PUT' && pathname === permissionsPath) permissionsChanged = true
    if (permissionsChanged && method === 'GET' && pathname === '/api/v1/auth/context')
      contextReceived = true
  }
  // 保留该角色旧列表登记；消息仅登记本次写入成功至新上下文响应前产生的请求。
  const observe = (request: Request) => {
    const url = new URL(request.url())
    if (
      request.method() === 'GET' &&
      url.pathname === '/api/v1/system/roles' &&
      url.searchParams.get('code') === code
    ) {
      diagnostics.cancel(request)
    }
    if (
      permissionsChanged &&
      !contextReceived &&
      request.method() === 'GET' &&
      (url.pathname === '/api/v1/system/messages' ||
        url.pathname === '/api/v1/system/messages/unread-count')
    ) {
      diagnostics.cancel(request)
    }
  }
  page.on('response', observeResponse)
  page.on('request', observe)
  try {
    const response = await act(page, 'PUT', permissionsPath, () =>
      dialog.getByRole('button', { name: '确定', exact: true }).click(),
    )
    expect((await refreshed).status()).toBe(200)
    await expect(dialog).not.toBeVisible()
    await page.waitForLoadState('networkidle')
    return response
  } finally {
    page.off('response', observeResponse)
    page.off('request', observe)
  }
}

function identityListAfterContext(
  page: Page,
  kind: 'role' | 'user',
  name: string,
  diagnostics: ReturnType<typeof observeSession>,
) {
  const listPath = `/api/v1/system/${kind}s`
  let created = false
  let contextReceived = false
  const requests = new WeakSet<Request>()
  const observeResponse = (response: Response) => {
    const request = response.request()
    const path = new URL(response.url()).pathname
    if (
      response.status() === 200 &&
      request.method() === 'POST' &&
      path === listPath &&
      request.postDataJSON()?.[kind === 'role' ? 'code' : 'username'] === name
    )
      created = true
    if (created && request.method() === 'GET' && path === '/api/v1/auth/context') {
      contextReceived = true
    }
  }
  const observe = (request: Request) => {
    const url = new URL(request.url())
    if (
      created &&
      request.method() === 'GET' &&
      url.pathname === listPath &&
      url.searchParams.get(kind === 'role' ? 'code' : 'username') ===
        (kind === 'role' ? '' : null) &&
      [...url.searchParams].every(([key, value]) =>
        ['page', 'page_size'].includes(key) ? true : value === '',
      ) &&
      url.searchParams.get('page') === '1' &&
      url.searchParams.get('page_size') === '10'
    ) {
      if (contextReceived) requests.add(request)
      // 仅本次身份提交成功至上下文响应之间产生的空筛选旧 scope 列表可以被取消。
      else diagnostics.cancel(request)
    }
  }
  page.on('response', observeResponse)
  page.on('request', observe)
  const context = waitForApiResponse(page, 'GET', '/api/v1/auth/context').then(async (response) => {
    await expectSuccessfulResponse(response)
  })
  const list = page.waitForResponse((response) => requests.has(response.request()))
  return {
    completed: Promise.all([context, list]).then(async ([, response]) => {
      await expectSuccessfulResponse(response)
      expect(await response.finished()).toBeNull()
    }),
    stop: () => {
      page.off('request', observe)
      page.off('response', observeResponse)
    },
  }
}

export async function createWriterRole(
  page: Page,
  diagnostics: ReturnType<typeof observeSession>,
  resources: SessionResources,
) {
  const code = isolatedName('session-role')
  await openIdentityPage(page, 'role')
  await page.locator('.card-header').getByRole('button', { name: '新增', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '新增角色', exact: true })
  await dialog.getByPlaceholder('请输入角色名称').fill(code)
  await dialog.getByPlaceholder('请输入角色编码').fill(code)
  // 新角色改变授权上下文；等待随后真正完成的新 scope 列表，再改变搜索条件。
  const refresh = identityListAfterContext(page, 'role', code, diagnostics)
  try {
    const [response] = await Promise.all([
      createOwnedIdentity(page, resources, 'role', code, () =>
        dialog.getByRole('button', { name: '确定', exact: true }).click(),
      ),
      refresh.completed,
    ])
    expect((await response.json()).data.is_super).toBe(0)
    await expect(dialog).not.toBeVisible()
  } finally {
    refresh.stop()
  }
  await setRolePermissions(page, code, writerPermissions, diagnostics)
  return code
}

/** 通过当前用户创建与密码激活流程准备普通用户，不直接写数据库。 */
export async function createOrdinaryUser(
  admin: Page,
  activation: BrowserContext,
  role: string,
  resources: SessionResources,
  diagnostics: ReturnType<typeof observeSession>,
  budget?: ReturnType<typeof observeRequestBudget>,
) {
  const username = isolatedName('session-user')
  await openIdentityPage(admin, 'user')
  await admin.locator('.card-header').getByRole('button', { name: '新增', exact: true }).click()
  const dialog = admin.getByRole('dialog', { name: '新增用户', exact: true })
  await dialog.getByPlaceholder('请输入用户名').fill(username)
  await dialog.getByPlaceholder('请输入昵称').fill(username)
  await dialog
    .locator('.el-select')
    .filter({
      has: admin.getByRole('combobox', { name: '角色', exact: true }),
    })
    .click()
  await dialog.getByRole('combobox', { name: '角色', exact: true }).fill(role)
  await admin.getByRole('option').filter({ hasText: role }).click()
  await dialog.getByPlaceholder('请输入昵称').click()
  const refresh = identityListAfterContext(admin, 'user', username, diagnostics)
  try {
    const [created] = await Promise.all([
      createOwnedIdentity(admin, resources, 'user', username, () =>
        dialog.getByRole('button', { name: '确定', exact: true }).click(),
      ),
      refresh.completed,
    ])
    const userId: string = (await created.json()).data.id
    expect(userId).toMatch(/^\d+$/u)
    await expect(dialog).not.toBeVisible()
  } finally {
    refresh.stop()
  }
  const identity = { ...credentials, username, password: 'Valid!Session123' }
  await changeInitialPassword(activation, identity, budget)
  return identity
}

export async function logout(page: Page) {
  await page.locator('.navbar .user-info').hover()
  await page.getByRole('menuitem', { name: '退出登录', exact: true }).click()
  await act(page, 'POST', '/api/v1/auth/logout', () =>
    page.locator('.el-message-box').getByRole('button', { name: '确定', exact: true }).click(),
  )
  await expect(page).toHaveURL(/\/login(?:\?|$)/u)
}
