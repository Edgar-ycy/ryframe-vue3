import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePermissionStore } from './permission'
import type { MenuTreeNode } from '@/api/modules/menu'

const routeBuilder = vi.hoisted(() => ({
  buildAccessibleMenus: vi.fn(),
  buildRoutesFromMenuTree: vi.fn(),
}))

vi.mock('@/router/menuRouteBuilder', () => routeBuilder)

describe('权限路由状态', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    routeBuilder.buildAccessibleMenus.mockReset()
    routeBuilder.buildRoutesFromMenuTree.mockReset()
  })

  it('从新菜单模型生成路由和当前用户可见菜单', () => {
    const tree = [{ id: 'menu-1' }] as MenuTreeNode[]
    const routes = [{ path: '/system' }]
    const menus = [{ path: '/system/users' }]
    routeBuilder.buildRoutesFromMenuTree.mockReturnValueOnce(routes)
    routeBuilder.buildAccessibleMenus.mockReturnValueOnce(menus)
    const store = usePermissionStore()

    const result = store.generateRoutes(tree, ['system:user:list'], ['operator'])

    expect(result).toBe(routes)
    expect(routeBuilder.buildRoutesFromMenuTree).toHaveBeenCalledWith(tree)
    expect(routeBuilder.buildAccessibleMenus).toHaveBeenCalledWith(
      routes,
      ['system:user:list'],
      ['operator'],
    )
    expect(store.routes).toEqual(routes)
    expect(store.menus).toEqual(menus)
    expect(store.isRoutesLoaded).toBe(true)
  })

  it('重置时清除与旧身份绑定的路由', () => {
    routeBuilder.buildRoutesFromMenuTree.mockReturnValueOnce([{ path: '/system' }])
    routeBuilder.buildAccessibleMenus.mockReturnValueOnce([{ path: '/system/users' }])
    const store = usePermissionStore()
    store.generateRoutes([], [], [])

    store.resetRoutes()

    expect(store.routes).toEqual([])
    expect(store.menus).toEqual([])
    expect(store.isRoutesLoaded).toBe(false)
  })
})
