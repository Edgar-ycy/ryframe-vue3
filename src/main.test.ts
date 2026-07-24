import { describe, expect, it, vi } from 'vitest'

const harness = vi.hoisted(() => {
  const root = { name: 'AppRoot' }
  const router = { name: 'router' }
  const pinia = { name: 'pinia' }
  const directives = { name: 'directives' }
  const icons = {
    Search: { name: 'SearchIcon' },
    User: { name: 'UserIcon' },
  }
  const app = {
    component: vi.fn(),
    use: vi.fn(),
    mount: vi.fn(),
  }

  return {
    app,
    createApp: vi.fn(() => app),
    directives,
    icons,
    installSessionCoordinator: vi.fn(),
    pinia,
    refreshAccessibleRoutes: vi.fn(),
    resetDynamicRoutes: vi.fn(),
    root,
    router,
  }
})

vi.mock('vue', () => ({
  createApp: harness.createApp,
}))
vi.mock('./App.vue', () => ({ default: harness.root }))
vi.mock('./router', () => ({
  default: harness.router,
  refreshAccessibleRoutes: harness.refreshAccessibleRoutes,
  resetDynamicRoutes: harness.resetDynamicRoutes,
}))
vi.mock('./stores', () => ({ default: harness.pinia }))
vi.mock('@/app/session/sessionCoordinator', () => ({
  installSessionCoordinator: harness.installSessionCoordinator,
}))
vi.mock('@/shared/ui/icons', () => ({ elementIcons: harness.icons }))
vi.mock('./directives', () => ({ default: harness.directives }))
vi.mock('./styles/index.scss', () => ({}))

describe('application startup', () => {
  it('registers shared UI and installs state, session, router, and directives before mounting', async () => {
    await import('./main')

    expect(harness.createApp).toHaveBeenCalledWith(harness.root)
    expect(harness.app.component).toHaveBeenNthCalledWith(1, 'Search', harness.icons.Search)
    expect(harness.app.component).toHaveBeenNthCalledWith(2, 'User', harness.icons.User)
    expect(harness.app.use).toHaveBeenNthCalledWith(1, harness.pinia)
    expect(harness.installSessionCoordinator).toHaveBeenCalledWith({
      router: harness.router,
      refreshAccessibleRoutes: harness.refreshAccessibleRoutes,
      resetDynamicRoutes: harness.resetDynamicRoutes,
    })
    expect(harness.app.use).toHaveBeenNthCalledWith(2, harness.router)
    expect(harness.app.use).toHaveBeenNthCalledWith(3, harness.directives)
    expect(harness.app.mount).toHaveBeenCalledWith('#app')

    const piniaInstallOrder = harness.app.use.mock.invocationCallOrder[0]
    const sessionInstallOrder = harness.installSessionCoordinator.mock.invocationCallOrder[0]
    const routerInstallOrder = harness.app.use.mock.invocationCallOrder[1]
    const mountOrder = harness.app.mount.mock.invocationCallOrder[0]
    expect(piniaInstallOrder).toBeLessThan(sessionInstallOrder)
    expect(sessionInstallOrder).toBeLessThan(routerInstallOrder)
    expect(routerInstallOrder).toBeLessThan(mountOrder)
  })
})
