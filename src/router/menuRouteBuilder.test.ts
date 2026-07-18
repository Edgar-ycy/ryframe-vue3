import { describe, expect, it } from 'vitest'
import type { MenuTreeNode } from '@/api/modules/menu'
import { buildAccessibleMenus, buildRoutesFromMenuTree } from './menuRouteBuilder'

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

  it('normalizes legacy visibility, status, inferred type, icons, and reserved paths', () => {
    const legacyPage = {
      ...node({
        id: '20',
        route_key: 'system.user',
        icon: 'user-round',
      }),
      menu_type: '',
      status: '',
      visible: '0',
    } as unknown as MenuTreeNode
    const nullablePage = {
      ...node({ id: '21', route_key: 'system.role' }),
      status: null,
      visible: null,
    } as unknown as MenuTreeNode

    const routes = buildRoutesFromMenuTree([
      legacyPage,
      nullablePage,
      node({ id: '22', route_key: 'home' }),
    ])

    expect(routes).toHaveLength(2)
    expect(routes[0].path).toBe('/system/user')
    expect(routes[0].meta).toMatchObject({ hidden: true, icon: 'UserRound' })
    expect(routes[1].meta?.hidden).toBe(false)
  })
})
