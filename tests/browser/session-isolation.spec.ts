import { expect, test } from '@playwright/test'
import type { SessionContext } from '@/api/modules/sessionContext'
import { installApiFixture } from './support/apiFixture'
import { expectCleanDiagnostics, observeDiagnostics } from './support/diagnostics'
import { loginWithFixture, openSidebarPage } from './support/navigation'
import { createSessionContext } from './support/sessionFixture'
import { publishRemoteAuthenticatedSession } from './support/sessionTransition'

function menuProjection(
  context: SessionContext,
  parentRouteKey: string,
  childRouteKey: string,
): SessionContext['menus'] {
  const parent = context.menus.find((menu) => menu.route_key === parentRouteKey)
  if (!parent) throw new Error(`浏览器 fixture 缺少菜单：${parentRouteKey}`)
  const children = parent.children.filter((menu) => menu.route_key === childRouteKey)
  if (children.length !== 1) throw new Error(`浏览器 fixture 缺少页面：${childRouteKey}`)
  return [{ ...parent, children }]
}

test('跨标签刷新原子隔离同租户主体、权限和跨租户请求范围', async ({ page }) => {
  const diagnostics = observeDiagnostics(page)
  const fixture = await installApiFixture(page, diagnostics, {
    multiTenancyEnabled: true,
    tenantId: 'default',
  })

  await loginWithFixture(page)
  await expect(page.getByRole('heading', { name: /测试用户/u })).toBeVisible()

  const initial = createSessionContext({ tenantId: 'default' })
  const downgraded: SessionContext = {
    ...initial,
    authorization_epoch: '12',
    menus: menuProjection(initial, 'system', 'system.post'),
    permissions: ['system:post:list'],
    roles: ['reader'],
    user: { ...initial.user, id: '43', nickname: '同租户用户乙' },
  }
  await publishRemoteAuthenticatedSession(page, 1, 'access-token-user-b', downgraded)

  await expect(page.getByRole('heading', { name: /同租户用户乙/u })).toBeVisible()
  await expect(page.getByRole('heading', { name: /测试用户/u })).toHaveCount(0)
  const sidebar = page.locator('.sidebar-container')
  await sidebar.getByText('系统管理', { exact: true }).click()
  await expect(sidebar.getByText('岗位管理', { exact: true })).toBeVisible()
  await expect(sidebar.getByText('用户管理', { exact: true })).toHaveCount(0)

  const systemTenant = createSessionContext({ tenantId: 'system' })
  const crossTenant: SessionContext = {
    ...systemTenant,
    authorization_epoch: '13',
    menus: menuProjection(systemTenant, 'platform', 'platform.tenant'),
    permissions: ['tenant:list', 'tenant:usage:list'],
    roles: ['tenant-auditor'],
    runtime_epoch: '8',
    user: { ...systemTenant.user, id: '44', nickname: '系统租户用户丙' },
  }
  await publishRemoteAuthenticatedSession(page, 2, 'access-token-system', crossTenant)

  await expect(page.getByRole('heading', { name: /系统租户用户丙/u })).toBeVisible()
  await openSidebarPage(page, '平台管理', '租户管理')
  await expect(page).toHaveURL(/\/platform\/tenants$/u)
  await expect(page.getByRole('heading', { name: '租户容量管理' })).toBeVisible()

  expect(fixture.tenantRequestContexts.length).toBeGreaterThan(0)
  for (const context of fixture.tenantRequestContexts) {
    expect(context).toEqual({
      authorization: 'Bearer access-token-system',
      tenantId: 'system',
    })
  }
  await expectCleanDiagnostics(page, diagnostics)
})
