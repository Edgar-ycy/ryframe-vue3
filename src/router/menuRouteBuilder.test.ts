import { describe, expect, it, vi } from 'vitest'
import type { Component } from 'vue'
import type { MenuTreeNode } from '@/api/modules/menu'
import { buildAccessibleMenus, buildRoutesFromMenuTree } from './menuRouteBuilder'
import { menuPageRegistry } from './pageRegistry'

vi.mock('@/router', () => ({ refreshAccessibleRoutes: vi.fn() }))

function node(overrides: Partial<MenuTreeNode>): MenuTreeNode {
  return {
    id: '1',
    name: '菜单',
    menu_type: 'C',
    sort: 0,
    status: '1',
    visible: true,
    ...overrides,
    children: overrides.children ?? [],
  }
}

describe('menu route builder', () => {
  it('builds registered directory and page routes while skipping invalid nodes', () => {
    const menuTree = [
      node({
        route_key: 'system',
        menu_type: 'M',
        children: [
          node({
            id: '2',
            name: '用户管理',
            route_key: 'system.user',
            menu_type: 'C',
            perm_code: 'system:user:list',
          }),
          node({ id: '3', name: '按钮', menu_type: 'F' }),
          node({ id: '4', name: '停用页面', route_key: 'system.role', status: '0' }),
        ],
      }),
      node({ id: '5', name: '未注册页面', route_key: 'unknown', menu_type: 'C' }),
    ]

    const routes = buildRoutesFromMenuTree(menuTree)

    expect(routes).toHaveLength(1)
    expect(routes[0].path).toBe('/system')
    expect(routes[0].redirect).toBe('/system/user')
    expect(routes[0].children).toHaveLength(1)
    expect(routes[0].children?.[0].path).toBe('user')
  })

  it('filters protected menus without mutating generated routes', () => {
    const routes = buildRoutesFromMenuTree([
      node({
        route_key: 'system',
        menu_type: 'M',
        children: [
          node({
            id: '2',
            route_key: 'system.user',
            menu_type: 'C',
            perm_code: 'system:user:list',
          }),
        ],
      }),
    ])

    const denied = buildAccessibleMenus(routes, [], [])
    const granted = buildAccessibleMenus(routes, ['system:user:list'], [])

    expect(denied.some(route => route.path === '/system')).toBe(false)
    expect(granted.some(route => route.path === '/system')).toBe(true)
    expect(routes[0].children).toHaveLength(1)
  })

  it('assigns unique fallback names to unregistered directories', () => {
    const routes = buildRoutesFromMenuTree([
      node({ id: '10', name: '目录一', menu_type: 'M' }),
      node({ id: '11', name: '目录二', menu_type: 'M' }),
    ])

    expect(routes.map(route => route.name)).toEqual(['menu_10', 'menu_11'])
  })

  it('rejects nodes that do not satisfy the current menu contract', () => {
    const malformedPage = {
      ...node({
        id: '20',
        route_key: 'system.user',
        icon: 'user-round',
      }),
      menu_type: '',
      status: '',
      visible: '0',
    } as unknown as MenuTreeNode

    expect(buildRoutesFromMenuTree([malformedPage])).toEqual([])
  })

  it('names every dynamic page component after its generated route record', async () => {
    const pageNodes = Object.entries(menuPageRegistry)
      .filter(([routeKey, page]) => routeKey !== 'home' && page.component)
      .map(([routeKey], index) => node({
        id: String(index + 100),
        route_key: routeKey,
        perm_code: `${routeKey}:list`,
      }))
    const routes = buildRoutesFromMenuTree(pageNodes)

    expect(routes).toHaveLength(pageNodes.length)
    await Promise.all(routes.map(async (route) => {
      const load = route.component as unknown as () => Promise<Component>
      const component = await load()
      const name = (component as unknown as { name?: string }).name
      expect(name, String(route.path)).toBe(String(route.name))
    }))
  }, 15_000)
})
