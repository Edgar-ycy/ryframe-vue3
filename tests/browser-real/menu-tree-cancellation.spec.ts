import { expect, type Locator, type Page, type Response } from '@playwright/test'
import type { MenuTreeNode } from '@/api/modules/menu'
import type { PermissionTreeNode } from '@/api/modules/permission'
import { loadRealBrowserEnvironment } from '../../scripts/real-browser-environment.mjs'
import { expectCleanDiagnostics } from '../browser/support/diagnostics'
import { test } from './fixture'
import {
  isSystemMenuRead,
  menuTreePath,
  observeMenuTreeCancellation,
} from './menu-tree-cancellation-probe'
import { observeRequestBudget } from './request-budget'
import { logout } from './session-identities'
import { act, credentials, isolatedName, login, waitForApiResponse } from './support'

const menuPath = '/api/v1/system/menus'
const permissionTreePath = '/api/v1/system/perms/tree'

function flatten<T extends { children?: T[] }>(nodes: T[]): T[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children ?? [])])
}

async function systemData<T>(response: Response): Promise<T> {
  expect(response.status()).toBe(200)
  expect(response.request().headers()['x-tenant-id']).toBe('system')
  const body: { code: number; data: T } = await response.json()
  expect(body.code).toBe(200)
  return body.data
}

function menuRow(page: Page, name: string) {
  return page.locator('.page-container .el-table__body tr').filter({
    has: page.getByRole('cell', { name, exact: true }),
  })
}

function permissionLabel(permission: PermissionTreeNode) {
  return `${permission.name} (${permission.code})`
}

async function selectPermission(page: Page, dialog: Locator, permission: PermissionTreeNode) {
  const field = dialog.locator('.el-form-item').filter({
    has: page.locator('label').filter({ hasText: /^关联权限$/u }),
  })
  await field.getByRole('combobox').click()
  await page.getByRole('option', { name: permissionLabel(permission), exact: true }).click()
}

async function openMenuPage(page: Page) {
  const sidebar = page.locator('.sidebar-container')
  const entry = sidebar.getByRole('menuitem', { name: '菜单管理', exact: true })
  if (!(await entry.isVisible())) await sidebar.getByText('系统管理', { exact: true }).click()
  const [menus, permissions] = await Promise.all([
    waitForApiResponse(page, 'GET', menuTreePath),
    waitForApiResponse(page, 'GET', permissionTreePath),
    entry.click(),
  ])
  await expect(page).toHaveURL(/\/system\/menu$/u)
  const menuTree = await systemData<MenuTreeNode[]>(menus)
  const permissionTree = flatten(await systemData<PermissionTreeNode[]>(permissions))
  const choices = new Map<string, PermissionTreeNode>()
  for (const permission of permissionTree) {
    if (
      permission.perm_type === 'api' &&
      permission.status === '1' &&
      permission.code &&
      ![...choices.values()].some((choice) => choice.id === permission.id)
    ) {
      choices.set(permissionLabel(permission), permission)
      if (choices.size === 2) break
    }
  }
  const [first, second] = choices.values()
  if (!first || !second) throw new Error('隔离 System 夹具需要两个不同的现有启用 API 权限')
  return { first, second, menuTree }
}

async function deleteButton(page: Page, row: Locator, name: string): Promise<Locator> {
  await expect(row).toHaveCount(1)
  await row.getByRole('button', { name: '删除', exact: true }).click()
  const confirm = page.locator('.el-message-box')
  await expect(confirm).toContainText(name)
  return confirm.getByRole('button', { name: '确认删除', exact: true })
}

async function readCurrentMenuTree(page: Page): Promise<MenuTreeNode[]> {
  const [response, tree] = await Promise.all([
    page.waitForResponse((value) => isSystemMenuRead(value.request()) && value.status() === 200),
    page.evaluate(async () => {
      const modulePath = '/src/api/modules/menu.ts'
      const module: typeof import('@/api/modules/menu') = await import(modulePath)
      return (await module.getMenuTree()).data
    }),
  ])
  const actual = await systemData<MenuTreeNode[]>(response)
  expect(tree).toEqual(actual)
  return actual
}

async function containsMenuVersion(response: Response, id: string, permission?: string) {
  const body: { code: number; data: MenuTreeNode[] } = await response.json()
  if (body.code !== 200 || !Array.isArray(body.data)) return false
  const menu = flatten(body.data).find((item) => item.id === id)
  return permission === undefined ? !menu : menu?.perm_id === permission
}

test.describe.configure({ retries: 0 })

test('真实菜单编辑与删除的树读取取消归属', async ({ page, clientAddress }, info) => {
  const environment = loadRealBrowserEnvironment()
  test.skip(
    environment.serverMode !== 'dev' ||
      environment.fixture !== 'core' ||
      Boolean(environment.restore),
    '仅用于隔离的真实 dev/core 菜单夹具',
  )
  expect(environment.gateEndpoint, '必须通过登记的透明代理绑定真实响应门').toBeTruthy()
  expect(credentials.tenantId).toBe('system')
  test.setTimeout(240_000)

  const budget = observeRequestBudget(page)
  const probe = await observeMenuTreeCancellation(page, clientAddress, info)
  await budget.beforePageBootstrap()
  const loginResponse = waitForApiResponse(page, 'POST', '/api/v1/auth/login')
  await login(page)
  const name = isolatedName('菜单树取消补证')
  const row = menuRow(page, name)
  const owned: {
    id?: string
    creationAttempted: boolean
    deletion: 'not-started' | 'submitted' | 'confirmed-absent'
  } = {
    creationAttempted: false,
    deletion: 'not-started',
  }
  async function cleanupOwnedMenu() {
    const { id } = owned
    if (id && owned.deletion !== 'confirmed-absent') {
      await budget.beforeCleanup()
      const located = flatten(await readCurrentMenuTree(page)).find((menu) => menu.id === id)
      if (!located) owned.deletion = 'confirmed-absent'
      else {
        expect(located).toMatchObject({ id, name, menu_type: 'F' })
        if (owned.deletion === 'submitted') throw new Error('原删除结果未确认且记录仍在，保留收据')
        await page.keyboard.press('Escape')
        const remove = await deleteButton(page, row, name)
        owned.deletion = 'submitted'
        await systemData<null>(await act(page, 'DELETE', `${menuPath}/${id}`, () => remove.click()))
        expect(flatten(await readCurrentMenuTree(page)).some((menu) => menu.id === id)).toBe(false)
        await expect(row).toHaveCount(0)
        owned.deletion = 'confirmed-absent'
      }
    }
  }

  try {
    const {
      data: { session_context: context },
    } = await (await loginResponse).json()
    expect(context.user.tenant_id).toBe('system')
    expect(context.is_super_admin).toBe(true)
    expect(context.password_change_required).toBe(false)
    const loginAuthorization = String(context.authorization_epoch)
    expect(loginAuthorization).toMatch(/^\d+$/u)

    const { first, second, menuTree } = await openMenuPage(page)
    await probe.bindScope()
    expect(flatten(menuTree).some((menu) => menu.name === name)).toBe(false)
    await budget.beforeAuthorizationChange()
    await page.locator('.card-header').getByRole('button', { name: '新增', exact: true }).click()
    const add = page.getByRole('dialog', { name: '新增菜单', exact: true })
    await add.getByPlaceholder('请输入菜单名称').fill(name)
    await add
      .locator('label.el-radio')
      .filter({ hasText: /^\s*按钮\s*$/u })
      .click()
    await selectPermission(page, add, first)
    owned.creationAttempted = true
    const created = await systemData<MenuTreeNode>(
      await act(page, 'POST', menuPath, () =>
        add.getByRole('button', { name: '确定', exact: true }).click(),
      ),
    )
    expect(created).toMatchObject({
      id: expect.stringMatching(/^\d+$/u),
      name,
      menu_type: 'F',
    })
    const id = created.id
    owned.id = id
    expect(created.perm_id).toBe(first.id)
    await expect(add).toBeHidden()
    await expect(row.getByRole('cell').nth(3)).toHaveText(permissionLabel(first))
    const path = `${menuPath}/${id}`

    await page.waitForLoadState('networkidle')
    await budget.beforeAuthorizationChange()
    await row.getByRole('button', { name: '编辑', exact: true }).click()
    const edit = page.getByRole('dialog', { name: '编辑菜单', exact: true })
    await selectPermission(page, edit, second)
    const updated = await probe.verify(
      {
        method: 'PUT',
        path,
        submit: () => edit.getByRole('button', { name: '确定', exact: true }).click(),
        acceptsReplacement: (response) => containsMenuVersion(response, created.id, second.id),
      },
      loginAuthorization,
    )
    expect(updated.request().postDataJSON()).toMatchObject({
      name,
      menu_type: 'F',
      perm_id: second.id,
    })
    expect(await systemData<MenuTreeNode>(updated)).toMatchObject({ id, perm_id: second.id })
    await expect(edit).toBeHidden()
    await expect(row.getByRole('cell').nth(3)).toHaveText(permissionLabel(second))

    await page.waitForLoadState('networkidle')
    await budget.beforeAuthorizationChange()
    const remove = await deleteButton(page, row, name)
    const removed = await probe.verify(
      {
        method: 'DELETE',
        path,
        submit: () => {
          owned.deletion = 'submitted'
          return remove.click()
        },
        acceptsReplacement: (response) => containsMenuVersion(response, created.id),
      },
      loginAuthorization,
    )
    expect(await systemData<null>(removed)).toBeNull()
    await expect(row).toHaveCount(0)
    owned.deletion = 'confirmed-absent'
    await expect(page).toHaveURL(/\/system\/menu$/u)
  } finally {
    try {
      await cleanupOwnedMenu()
    } finally {
      await info.attach('owned-menu-cleanup', {
        body: JSON.stringify({ name, ...owned }),
        contentType: 'application/json',
      })
      await page.waitForLoadState('networkidle')
      await logout(page)
    }
  }
  await expectCleanDiagnostics(page, probe.diagnostics)
})
