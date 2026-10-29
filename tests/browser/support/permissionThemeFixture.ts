import { expect, type Page } from '@playwright/test'
import type { DeptNode } from '@/api/modules/dept'
import type { PermissionTreeNode } from '@/api/modules/permission'
import { installApiFixture } from './apiFixture'
import { fixtureRequest, fulfillJson } from './http'
import { createSessionContext } from './sessionFixture'
import type { BrowserDiagnostics } from './types'

export const permissionRows: PermissionTreeNode[] = [
  {
    id: '3101',
    name: '主题菜单权限',
    code: 'system:theme:menu',
    parent_id: null,
    perm_type: 'menu',
    sort: 1,
    status: '1',
    children: [],
  },
  {
    id: '3102',
    name: '主题接口权限',
    code: 'system:theme:read',
    parent_id: null,
    perm_type: 'api',
    sort: 2,
    status: '1',
    children: [],
  },
  {
    id: '3103',
    name: '停用接口权限',
    code: 'system:theme:disabled',
    parent_id: null,
    perm_type: 'api',
    sort: 3,
    status: '0',
    children: [],
  },
]

export async function installPermissionThemeFixture(
  page: Page,
  diagnostics: BrowserDiagnostics,
): Promise<{ permissionRequests: string[] }> {
  const options = { tenantId: 'system', multiTenancyEnabled: false } as const
  await installApiFixture(page, diagnostics, options)
  const context = createSessionContext(options)
  context.permissions.push(
    'system:perm:list',
    'system:perm:add',
    'system:perm:edit',
    'system:perm:remove',
  )
  const systemMenu = context.menus.find((menu) => menu.route_key === 'system')
  if (!systemMenu) throw new Error('会话 fixture 缺少系统菜单')
  systemMenu.children.push({
    children: [],
    icon: '',
    id: '103',
    menu_type: 'C',
    name: 'system.perm',
    parent_id: systemMenu.id,
    perm_code: 'system:perm:list',
    route_key: 'system.perm',
    sort: 3,
    status: '1',
    visible: true,
  })
  const departments: DeptNode[] = []
  const permissionRequests: string[] = []
  const paths = new Set([
    '/auth/login',
    '/auth/context',
    '/system/perms/tree',
    '/system/depts/tree',
  ])
  await page.route('**/api/v1/**', async (route) => {
    const { path, method, request, url } = fixtureRequest(route)
    if (!paths.has(path)) {
      await route.fallback()
      return
    }
    expect(method, `局部 fixture 不接受 ${method} ${path}`).toBe(
      path === '/auth/login' ? 'POST' : 'GET',
    )
    expect(url.search, `局部 fixture 不接受额外查询参数：${path}`).toBe('')
    if (path === '/auth/login') {
      const body: unknown = request.postDataJSON()
      expect(body).toMatchObject({ username: 'tester', password: 'browser-secret' })
      expect(request.headers()['x-csrf-token']).toBe('csrf-smoke')
      await fulfillJson(route, {
        access_token: 'access-token-smoke',
        expires_in: 900,
        session_context: context,
      })
    } else if (path === '/auth/context') {
      await fulfillJson(route, context)
    } else if (path === '/system/perms/tree') {
      permissionRequests.push(request.url())
      await fulfillJson(route, permissionRows)
    } else {
      await fulfillJson(route, departments)
    }
  })
  return { permissionRequests }
}
