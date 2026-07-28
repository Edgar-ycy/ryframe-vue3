import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface TestRoute {
  path: string
  name?: string
}

interface GuardTarget {
  meta?: { title?: string }
}

interface GuardDependencies {
  isKnownRoute(path: string): boolean
}

const harness = vi.hoisted(() => {
  const routeNames = new Set<string>()
  let registeredBeforeEach: ((target: GuardTarget) => unknown) | undefined

  const router = {
    addRoute: vi.fn((route: TestRoute) => {
      if (route.name) routeNames.add(route.name)
      return () => {
        if (route.name) routeNames.delete(route.name)
      }
    }),
    beforeEach: vi.fn((guard: (target: GuardTarget) => unknown) => {
      registeredBeforeEach = guard
      return vi.fn()
    }),
    hasRoute: vi.fn((name: string) => routeNames.has(name)),
    removeRoute: vi.fn((name: string) => {
      routeNames.delete(name)
    }),
    resolve: vi.fn((path: string) => ({
      matched: path === '/known'
        ? [{ path: '/known' }]
        : [{ path: '/:pathMatch(.*)*' }],
    })),
  }

  return {
    routeNames,
    router,
    getRegisteredBeforeEach: () => registeredBeforeEach,
    clearRegisteredBeforeEach: () => {
      registeredBeforeEach = undefined
    },
    createRouter: vi.fn((_options: { scrollBehavior(): { top: number } }) => router),
    createWebHistory: vi.fn(() => ({ kind: 'history' })),
    getUserMenus: vi.fn(),
    permissionStore: {
      generateRoutes: vi.fn(),
      resetRoutes: vi.fn(),
    },
    userStore: {
      permissions: ['system:user:list'],
      roles: ['operator'],
    },
    initializeSession: vi.fn(),
    clearSession: vi.fn(),
    navigationGuard: vi.fn(),
    createNavigationGuard: vi.fn(),
  }
})

vi.mock('vue-router', () => ({
  createRouter: harness.createRouter,
  createWebHistory: harness.createWebHistory,
}))

vi.mock('./routes/constant', () => ({
  constantRoutes: [{ path: '/login', name: 'Login' }],
}))

vi.mock('@/api/modules/menu', () => ({
  getUserMenus: harness.getUserMenus,
}))

vi.mock('@/stores/permission', () => ({
  usePermissionStore: () => harness.permissionStore,
}))

vi.mock('@/stores/user', () => ({
  useUserStore: () => harness.userStore,
}))

vi.mock('@/app/session/sessionCoordinator', () => ({
  initializeSession: harness.initializeSession,
  clearSession: harness.clearSession,
}))

vi.mock('./navigationGuard', () => ({
  createNavigationGuard: harness.createNavigationGuard,
}))

describe('router entry point', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubGlobal('document', { title: '' })
    harness.routeNames.clear()
    harness.clearRegisteredBeforeEach()
    harness.userStore.permissions = ['system:user:list']
    harness.userStore.roles = ['operator']
    harness.navigationGuard.mockResolvedValue(true)
    harness.createNavigationGuard.mockReturnValue(harness.navigationGuard)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches menus, generates accessible routes with user grants, and registers them', async () => {
    const menuTree = [{ id: 'menu-1', children: [] }]
    const accessRoutes = [
      { path: '/users', name: 'Users' },
      { path: '/roles', name: 'Roles' },
    ]
    harness.getUserMenus.mockResolvedValue({ data: menuTree, rows: [{ id: 'ignored' }] })
    harness.permissionStore.generateRoutes.mockReturnValue(accessRoutes)
    const { refreshAccessibleRoutes } = await import('./index')

    await expect(refreshAccessibleRoutes({ skipAuthRefresh: true })).resolves.toBe(accessRoutes)

    expect(harness.getUserMenus).toHaveBeenCalledOnce()
    expect(harness.getUserMenus).toHaveBeenCalledWith({ skipAuthRefresh: true })
    expect(harness.permissionStore.resetRoutes).toHaveBeenCalledOnce()
    expect(harness.permissionStore.generateRoutes).toHaveBeenCalledWith(
      menuTree,
      ['system:user:list'],
      ['operator'],
    )
    expect(harness.router.addRoute).toHaveBeenNthCalledWith(1, accessRoutes[0])
    expect(harness.router.addRoute).toHaveBeenNthCalledWith(2, accessRoutes[1])
    expect(harness.routeNames).toEqual(new Set(['Users', 'Roles']))
  })

  it('handles paged and empty menu responses', async () => {
    const items = [{ id: 'menu-from-page', children: [] }]
    harness.getUserMenus
      .mockResolvedValueOnce({ data: items })
      .mockResolvedValueOnce({})
    harness.permissionStore.generateRoutes
      .mockReturnValueOnce([])
      .mockReturnValueOnce([])
    const { refreshAccessibleRoutes } = await import('./index')

    await refreshAccessibleRoutes()
    await refreshAccessibleRoutes()

    expect(harness.permissionStore.generateRoutes).toHaveBeenNthCalledWith(
      1,
      items,
      ['system:user:list'],
      ['operator'],
    )
    expect(harness.permissionStore.generateRoutes).toHaveBeenNthCalledWith(
      2,
      [],
      ['system:user:list'],
      ['operator'],
    )
  })

  it('removes only previously registered dynamic routes across refreshes and resets', async () => {
    const firstRoutes = [{ path: '/first', name: 'First' }]
    const secondRoutes = [{ path: '/second', name: 'Second' }]
    harness.routeNames.add('Constant')
    harness.getUserMenus.mockResolvedValue({ data: [] })
    harness.permissionStore.generateRoutes
      .mockReturnValueOnce(firstRoutes)
      .mockReturnValueOnce(secondRoutes)
    const { refreshAccessibleRoutes, resetDynamicRoutes } = await import('./index')

    await refreshAccessibleRoutes()
    await refreshAccessibleRoutes()

    expect(harness.router.removeRoute).toHaveBeenCalledWith('First')
    expect(harness.routeNames).toEqual(new Set(['Constant', 'Second']))

    resetDynamicRoutes()
    resetDynamicRoutes()

    expect(harness.router.removeRoute).toHaveBeenCalledWith('Second')
    expect(harness.router.removeRoute).not.toHaveBeenCalledWith('Constant')
    expect(harness.routeNames).toEqual(new Set(['Constant']))
  })

  it('leaves route state reset when fetching a replacement menu fails', async () => {
    const existingRoutes = [{ path: '/existing', name: 'Existing' }]
    harness.getUserMenus
      .mockResolvedValueOnce({ data: [] })
      .mockRejectedValueOnce(new Error('menu unavailable'))
    harness.permissionStore.generateRoutes.mockReturnValueOnce(existingRoutes)
    const { refreshAccessibleRoutes } = await import('./index')
    await refreshAccessibleRoutes()

    await expect(refreshAccessibleRoutes()).rejects.toThrow('menu unavailable')

    expect(harness.router.removeRoute).toHaveBeenCalledWith('Existing')
    expect(harness.permissionStore.resetRoutes).toHaveBeenCalledTimes(2)
    expect(harness.router.addRoute).toHaveBeenCalledOnce()
    expect(harness.routeNames).toEqual(new Set())
  })

  it('wires title updates and known-route lookup into the navigation guard', async () => {
    const navigationResult = { path: '/login' }
    harness.navigationGuard.mockResolvedValueOnce(navigationResult)
    const { default: router } = await import('./index')
    const registeredGuard = harness.getRegisteredBeforeEach()

    await expect(registeredGuard?.({ meta: { title: 'User management' } }))
      .resolves.toBe(navigationResult)
    expect(document.title).toBe('User management - RyFrame')
    await expect(registeredGuard?.({})).resolves.toBe(true)
    expect(document.title).toBe(' - RyFrame')
    expect(router).toBe(harness.router)

    const dependencies = harness.createNavigationGuard.mock.calls[0]?.[0] as GuardDependencies
    expect(dependencies.isKnownRoute('/known')).toBe(true)
    expect(dependencies.isKnownRoute('/missing')).toBe(false)

    const routerOptions = harness.createRouter.mock.calls[0]![0]
    expect(routerOptions.scrollBehavior()).toEqual({ top: 0 })
  })
})
