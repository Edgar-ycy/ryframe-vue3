import { expect, test } from '@playwright/test'
import type { MenuTreeNode } from '@/api/modules/menu'
import type { PermissionTreeNode } from '@/api/modules/permission'
import type { SessionContext } from '@/features/session/contracts'
import { installApiFixture } from './support/apiFixture'
import { expectCleanDiagnostics, observeDiagnostics } from './support/diagnostics'
import { fixtureRequest, fulfillJson } from './support/http'
import { loginWithFixture, openSidebarPage } from './support/navigation'
import { createSessionContext } from './support/sessionFixture'
import { publishRemoteAuthenticatedSession } from './support/sessionTransition'

const menusPath = '/system/menus/tree'
const permissionsPath = '/system/perms/tree'
const parentId = '9001'
const childId = '9002'
const permissionId = '9101'
const missingPermissionId = '9199'
const defaultToken = 'access-token-smoke'
const systemToken = 'access-token-menu-system'

function menuSession(tenantId: 'default' | 'system'): SessionContext {
  const session = createSessionContext({ tenantId })
  const systemMenu = session.menus.find((menu) => menu.route_key === 'system')
  if (!systemMenu) throw new Error('会话夹具缺少系统菜单')
  systemMenu.children.push({
    children: [],
    id: '103',
    menu_type: 'C',
    name: 'system.menu',
    parent_id: systemMenu.id,
    perm_code: 'system:menu:list',
    route_key: 'system.menu',
    sort: 3,
    status: '1',
    visible: true,
  })
  session.permissions.push('system:menu:list', 'system:menu:edit', 'system:perm:list')
  return session
}

function menus(scope: '甲' | '乙', refreshed: boolean): MenuTreeNode[] {
  const child: MenuTreeNode = {
    children: [],
    id: childId,
    menu_type: 'C',
    name: `${scope}关联菜单`,
    parent_id: parentId,
    perm_id: refreshed ? missingPermissionId : permissionId,
    perm_code: refreshed
      ? 'menu:refreshed'
      : `menu:${scope === '甲' ? 'default' : 'system'}:fallback`,
    sort: 1,
    status: refreshed ? '0' : '1',
    visible: true,
  }
  return [
    {
      children: [
        child,
        {
          ...child,
          id: '9003',
          name: `${scope}缺失权限`,
          perm_id: missingPermissionId,
          perm_code: 'menu:missing',
          sort: 2,
        },
        {
          ...child,
          id: '9004',
          name: `${scope}空权限编码`,
          perm_id: '',
          perm_code: '',
          sort: 3,
        },
      ],
      id: parentId,
      menu_type: 'M',
      name: `${scope}菜单目录`,
      perm_id: null,
      perm_code: 'menu:ignored',
      sort: 1,
      status: '1',
      visible: true,
    },
  ]
}

function permissions(scope: '甲' | '乙'): PermissionTreeNode[] {
  const permission: PermissionTreeNode = {
    children: [],
    code: `menu:${scope === '甲' ? 'default' : 'system'}:read`,
    id: permissionId,
    name: `${scope}租户权限`,
    perm_type: 'menu',
    sort: 1,
    status: '1',
  }
  return [permission, { ...permission, name: '同 ID 后续权限', sort: 2 }]
}

test('菜单关联权限随保存刷新与跨租户同 ID 的查询结果更新', async ({ page }) => {
  const diagnostics = observeDiagnostics(page)
  await installApiFixture(page, diagnostics, { multiTenancyEnabled: true, tenantId: 'default' })
  const defaultSession = menuSession('default')
  const systemSession = menuSession('system')
  systemSession.authorization_epoch = '12'
  systemSession.runtime_epoch = '8'
  systemSession.user.nickname = '切换后的菜单用户'
  let activeSession = defaultSession
  let refreshed = false
  const systemReads = new Set<string>()
  let releaseSystemPermissions: () => void = () => undefined
  const pendingSystemPermissions = new Promise<void>((resolve) => {
    releaseSystemPermissions = resolve
  })

  await page.route('**/api/v1/**', async (route) => {
    const { key, path, request } = fixtureRequest(route)
    if (key === 'POST /auth/login') {
      await fulfillJson(route, {
        access_token: defaultToken,
        expires_in: 900,
        session_context: defaultSession,
      })
      return
    }
    if (key === 'GET /auth/context') {
      await fulfillJson(route, activeSession)
      return
    }
    if (key === `PUT /system/menus/${childId}`) {
      expect(request.headers()).toMatchObject({
        authorization: `Bearer ${defaultToken}`,
        'x-tenant-id': 'default',
      })
      expect(request.postDataJSON()).toMatchObject({ perm_id: permissionId, status: '0' })
      refreshed = true
      await fulfillJson(route, null)
      return
    }
    if (key === `GET ${menusPath}` || key === `GET ${permissionsPath}`) {
      const tenantId = activeSession.user.tenant_id
      const system = tenantId === 'system'
      const scope = system ? '乙' : '甲'
      expect(request.headers()).toMatchObject({
        authorization: `Bearer ${system ? systemToken : defaultToken}`,
        'x-tenant-id': tenantId,
      })
      if (system) systemReads.add(path)
      if (system && path === permissionsPath) await pendingSystemPermissions
      await fulfillJson(
        route,
        path === menusPath ? menus(scope, !system && refreshed) : permissions(scope),
      )
      return
    }
    await route.fallback()
  })

  const table = page.locator('.page-container .el-table')
  const row = (name: string) =>
    table.getByRole('row').filter({ has: page.getByText(name, { exact: true }) })
  const permission = (name: string) => row(name).getByRole('cell').nth(3)
  const expand = async (name: string) => {
    const toggle = row(name).locator('.el-table__expand-icon')
    await expect(toggle).toBeVisible()
    if (!(await toggle.getAttribute('class'))?.includes('el-table__expand-icon--expanded')) {
      await toggle.click()
    }
  }

  await loginWithFixture(page)
  await openSidebarPage(page, '系统管理', '菜单管理')
  await expect(page).toHaveURL(/\/system\/menu$/u)
  await expect(table.getByRole('columnheader', { name: '关联权限', exact: true })).toBeVisible()
  await expect(permission('甲菜单目录')).toHaveText('-')
  await expand('甲菜单目录')
  await expect(permission('甲关联菜单')).toHaveText('甲租户权限 (menu:default:read)')
  await expect(permission('甲缺失权限')).toHaveText('menu:missing')
  await expect(permission('甲空权限编码')).toHaveText('')

  const changed = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === `/api/v1${menusPath}`,
  )
  const status = row('甲关联菜单')
  await expect(status.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  await status.locator('.el-switch__core').click()
  await page.locator('.el-message-box').getByRole('button', { name: '确定', exact: true }).click()
  expect((await changed).ok()).toBe(true)
  expect(refreshed).toBe(true)
  await expand('甲菜单目录')
  await expect(permission('甲关联菜单')).toHaveText('menu:refreshed')

  try {
    activeSession = systemSession
    await publishRemoteAuthenticatedSession(page, 1, systemToken, systemSession)
    await expect(
      page.getByRole('button', { name: systemSession.user.nickname, exact: true }),
    ).toBeVisible()
    const menuLink = page.locator('.sidebar-container').getByText('菜单管理', { exact: true })
    if (await menuLink.isVisible()) await menuLink.click()
    else await openSidebarPage(page, '系统管理', '菜单管理')
    await expect(page).toHaveURL(/\/system\/menu$/u)
    await expand('乙菜单目录')
    await expect(permission('乙关联菜单')).toHaveText('menu:system:fallback')
    await expect(row('甲关联菜单')).toHaveCount(0)
  } finally {
    releaseSystemPermissions()
  }
  await expect(permission('乙关联菜单')).toHaveText('乙租户权限 (menu:system:read)')
  expect([...systemReads].sort()).toEqual([menusPath, permissionsPath])
  await expectCleanDiagnostics(page, diagnostics)
})
