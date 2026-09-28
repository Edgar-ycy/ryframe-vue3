import { vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  authenticated: vi.fn(),
  apply: vi.fn(),
  challenge: vi.fn(),
  clearChallenge: vi.fn(),
  clearChannel: vi.fn(),
  clearEpoch: vi.fn(),
  clearObservation: vi.fn(),
  closeViews: vi.fn(),
  configureHttp: vi.fn(),
  configureReporter: vi.fn(),
  error: vi.fn(),
  failClosed: vi.fn(),
  installChannel: vi.fn(),
  logout: vi.fn(),
  pendingRefresh: vi.fn(),
  publishLogout: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
  resetRoutes: vi.fn(),
  resetTenant: vi.fn(),
  resetUser: vi.fn(),
  routeReady: vi.fn(),
  scope: vi.fn(),
  setTerminating: vi.fn(),
  start: vi.fn(),
  synchronize: vi.fn(),
  warning: vi.fn(),
  permissionReset: vi.fn(),
  runtime: true,
  path: '/home',
  user: { token: 'access', sessionStatus: 'unknown' },
}))
vi.mock('element-plus', () => ({ ElMessage: { error: mocks.error, warning: mocks.warning } }))
vi.mock('@/i18n', () => ({ translate: (key: string) => key }))
vi.mock('@/api/modules/auth', () => ({ logout: mocks.logout }))
vi.mock('@/shared/http/client', async (original) => ({
  ...(await original<typeof import('@/shared/http/client')>()),
  configureHttpSession: mocks.configureHttp,
}))
vi.mock('@/shared/query/client', () => ({
  configureServerStateErrorReporter: mocks.configureReporter,
  getServerStateScope: mocks.scope,
}))
vi.mock('@/stores/user', () => ({
  useUserStore: () => Object.assign(mocks.user, { resetState: mocks.resetUser }),
}))
vi.mock('@/stores/permission', () => ({
  usePermissionStore: () => ({ resetRoutes: mocks.permissionReset }),
}))
vi.mock('@/stores/tagsView', () => ({
  useTagsViewStore: () => ({ closeAllViews: mocks.closeViews }),
}))
vi.mock('@/app/navigation/runtime', () => ({
  getRouteRuntime: () =>
    mocks.runtime
      ? {
          router: { currentRoute: { value: { path: mocks.path } }, replace: mocks.replace },
          resetDynamicRoutes: mocks.resetRoutes,
        }
      : undefined,
}))
vi.mock('@/app/tenant-context/coordinator', () => ({
  failClosedTenantContext: mocks.failClosed,
  resetTenantContext: mocks.resetTenant,
}))
vi.mock('@/app/tenant-context/contextRefresh', () => ({
  observeTenantContext: vi.fn(),
  resetTenantContextObservation: mocks.clearObservation,
  synchronizeTenantContextUi: mocks.synchronize,
}))
vi.mock('@/app/session/channel', () => ({
  broadcastAuthenticated: mocks.authenticated,
  broadcastLogout: mocks.publishLogout,
  installSessionChannel: mocks.installChannel,
  invalidateSessionChannelOperations: mocks.clearChannel,
  startLocalRefreshOperation: mocks.start,
}))
vi.mock('@/app/session/csrf', () => ({
  ensureCsrfToken: mocks.challenge,
  invalidateCsrfToken: mocks.clearChallenge,
}))
vi.mock('@/app/session/refresh', () => ({
  getPendingRefresh: mocks.pendingRefresh,
  refreshAccessToken: mocks.refresh,
}))
vi.mock('@/app/session/state', () => ({
  applyAuthenticatedSession: mocks.apply,
  ensureRoutesAfterAuthentication: mocks.routeReady,
  invalidateSessionEpoch: mocks.clearEpoch,
  isSessionTerminating: () => false,
  setSessionTerminating: mocks.setTerminating,
}))

export { mocks }
