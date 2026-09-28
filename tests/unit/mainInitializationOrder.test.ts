import { getActivePinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'

const scenario = vi.hoisted(() => ({
  events: [] as string[],
  globalProperties: undefined as Record<string, unknown> | undefined,
  settingsCalls: 0,
  settingsHadI18n: false,
  settingsHadPinia: false,
}))

vi.mock('vue', async () => {
  const actual = await vi.importActual<typeof import('vue')>('vue')
  return {
    ...actual,
    createApp: ((rootComponent: Parameters<typeof actual.createSSRApp>[0]) => {
      const app = actual.createSSRApp(rootComponent)
      scenario.globalProperties = app.config.globalProperties
      app.mount = ((container: string) => {
        scenario.events.push(`mount:${container}`)
        return {} as ReturnType<typeof app.mount>
      }) as typeof app.mount
      return app
    }) as typeof actual.createApp,
  }
})

vi.mock('@/App.vue', () => ({ default: { render: () => null } }))
vi.mock('element-plus/es/components/message/style/css', () => ({}))
vi.mock('element-plus/es/components/message-box/style/css', () => ({}))
vi.mock('@tanstack/vue-query', () => ({
  VueQueryPlugin: { install: () => scenario.events.push('vue-query') },
}))
vi.mock('@/router', () => ({
  default: { install: () => scenario.events.push('router') },
  ensureAccessibleRoutes: vi.fn(),
  refreshAccessibleRoutes: vi.fn(),
  resetDynamicRoutes: vi.fn(),
  resolveAccessibleRoute: vi.fn(),
  installRouterApplicationRuntime: () => scenario.events.push('router-runtime'),
}))
vi.mock('@/app/errorHandler', () => ({
  installGlobalErrorHandlers: () => scenario.events.push('error-handlers'),
}))
vi.mock('@/app/navigation/runtime', () => ({
  installRouteRuntime: () => scenario.events.push('route-runtime'),
}))
vi.mock('@/app/runtime-capabilities/coordinator', () => ({
  ensureRuntimeCapabilitiesLoaded: vi.fn(),
}))
vi.mock('@/app/settings/coordinator', () => ({
  initializeSettings: () => {
    scenario.settingsCalls += 1
    scenario.settingsHadPinia = getActivePinia() !== undefined
    scenario.settingsHadI18n = typeof scenario.globalProperties?.$t === 'function'
    scenario.events.push('settings')
  },
}))
vi.mock('@/app/session/sessionCoordinator', () => ({
  clearSession: vi.fn(),
  initializeSession: vi.fn(),
  installSessionCoordinator: () => scenario.events.push('session'),
}))
vi.mock('@/app/tenant-context/coordinator', () => ({ ensureTenantContextLoaded: vi.fn() }))
vi.mock('@/stores/tenantContext', () => ({ useTenantContextStore: vi.fn() }))
vi.mock('@/features/navigation/routeProjection', () => ({
  installRouteProjection: () => scenario.events.push('route-projection'),
}))
vi.mock('@/shared/http/client', () => ({
  configureHttpLocalization: () => scenario.events.push('http-localization'),
}))
vi.mock('@/directives', () => ({
  default: { install: () => scenario.events.push('directives') },
}))
vi.mock('@/shared/query/client', () => ({ queryClient: {} }))
vi.mock('@/router/routes/constant', () => ({ constantRoutes: [] }))
vi.mock('@/router/routeProjectionAdapter', () => ({ projectRouteRecords: () => [] }))

describe('应用启动顺序', () => {
  it('在真实 Pinia 和 i18n 安装后、路由与会话初始化前应用设置', async () => {
    await import('@/main')

    expect(scenario.settingsCalls).toBe(1)
    expect(scenario.settingsHadPinia).toBe(true)
    expect(scenario.settingsHadI18n).toBe(true)

    const settingsIndex = scenario.events.indexOf('settings')
    expect(settingsIndex).toBeGreaterThan(scenario.events.indexOf('http-localization'))
    expect(settingsIndex).toBeLessThan(scenario.events.indexOf('route-projection'))
    expect(settingsIndex).toBeLessThan(scenario.events.indexOf('router-runtime'))
    expect(settingsIndex).toBeLessThan(scenario.events.indexOf('session'))
    expect(settingsIndex).toBeLessThan(scenario.events.indexOf('router'))
    expect(scenario.events.at(-1)).toBe('mount:#app')
  })
})
