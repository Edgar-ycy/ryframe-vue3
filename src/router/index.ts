import {
  createRouter,
  createWebHistory,
  type RouteLocationRaw,
  type RouteRecordRaw,
} from 'vue-router'
import type { SessionContext } from '@/features/session/contracts'
import { matchedRouteAccessResult } from '@/features/navigation/routeAccess'
import {
  buildAccessibleMenus,
  buildRoutesFromMenuTree,
} from '@/features/navigation/routeProjection'
import type { RouteProjection } from '@/shared/navigation/routeProjection'
import { usePermissionStore } from '@/stores/permission'
import { useRuntimeCapabilitiesStore } from '@/stores/runtimeCapabilities'
import { useUserStore } from '@/stores/user'
import { ROOT_LAYOUT_ROUTE_NAME } from './layout'
import { createNavigationGuard } from './navigationGuard'
import { restoreRouteRecords } from './routeProjectionAdapter'
import { RuntimeRouteRegistry } from './runtimeRouteRegistry'
import { constantRoutes } from './routes/constant'

const router = createRouter({
  history: createWebHistory(),
  routes: constantRoutes,
  scrollBehavior: () => ({ top: 0 }),
})

const runtimeRouteRegistry = new RuntimeRouteRegistry(router)

interface RouterTenantContext {
  capabilityCodes: string[]
  context?: Pick<SessionContext, 'menus' | 'permissions'>
}

export interface RouterApplicationRuntime {
  clearSession(): Promise<void>
  ensureRuntimeCapabilitiesLoaded(): Promise<void>
  ensureTenantContextLoaded(): Promise<void>
  getTenantContext(): RouterTenantContext
  initializeSession(): Promise<void>
}

let applicationRuntime: RouterApplicationRuntime | undefined

/** 由 main 同时装配 router 与应用用例，router 不直接依赖 app 实现。 */
export function installRouterApplicationRuntime(runtime: RouterApplicationRuntime): void {
  applicationRuntime = runtime
}

function requireApplicationRuntime(): RouterApplicationRuntime {
  if (!applicationRuntime) throw new Error('路由应用运行时尚未安装')
  return applicationRuntime
}

interface RouteInstallation {
  generation: number
  promise: Promise<RouteRecordRaw[]>
}

let routeGeneration = 0
let installedGeneration = -1
let routeInstallation: RouteInstallation | undefined
let routeRefreshPromise: Promise<RouteRecordRaw[]> | undefined

async function buildAccessibleRoutes(generation: number): Promise<RouteProjection[] | undefined> {
  const runtime = requireApplicationRuntime()
  await runtime.ensureTenantContextLoaded()
  if (generation !== routeGeneration) return undefined
  const tenantContext = runtime.getTenantContext()
  const permissionStore = usePermissionStore()
  const context = tenantContext.context
  if (!context) return undefined
  if (!permissionStore.isRoutesLoaded) {
    const routes = buildRoutesFromMenuTree(context.menus)
    const menus = buildAccessibleMenus(routes, context.permissions, tenantContext.capabilityCodes)
    permissionStore.applyRouteProjection(routes, menus)
  }
  return permissionStore.routes
}

/**
 * 确保当前会话的动态路由只安装一次；同一代际中的并发调用共享同一个请求。
 */
export function ensureAccessibleRoutes(options?: {
  skipAuthRefresh?: boolean
}): Promise<RouteRecordRaw[]> {
  void options
  const permissionStore = usePermissionStore()
  if (permissionStore.isRoutesLoaded && installedGeneration === routeGeneration) {
    return Promise.resolve(restoreRouteRecords(permissionStore.routes))
  }

  const generation = routeGeneration
  if (routeInstallation?.generation === generation) return routeInstallation.promise

  const promise = (async () => {
    try {
      const projection = await buildAccessibleRoutes(generation)
      if (!projection || generation !== routeGeneration) return []
      const routes = restoreRouteRecords(projection)
      runtimeRouteRegistry.add(ROOT_LAYOUT_ROUTE_NAME, routes)
      installedGeneration = generation
      return routes
    } catch (error) {
      if (generation === routeGeneration) {
        runtimeRouteRegistry.reset()
        permissionStore.resetRoutes()
      }
      throw error
    }
  })()

  routeInstallation = { generation, promise }
  const clearInstallation = () => {
    if (routeInstallation?.promise === promise) routeInstallation = undefined
  }
  void promise.then(clearInstallation, clearInstallation)
  return promise
}

export function resetDynamicRoutes(): void {
  routeGeneration += 1
  installedGeneration = -1
  runtimeRouteRegistry.reset()
}

/** 强制重新读取权限；并发刷新仍然合并为一次。 */
export function refreshAccessibleRoutes(options?: {
  skipAuthRefresh?: boolean
}): Promise<RouteRecordRaw[]> {
  if (routeRefreshPromise) return routeRefreshPromise

  const permissionStore = usePermissionStore()
  const promise = (async () => {
    resetDynamicRoutes()
    permissionStore.resetRoutes()
    return ensureAccessibleRoutes(options)
  })()
  routeRefreshPromise = promise
  const clearRefresh = () => {
    if (routeRefreshPromise === promise) routeRefreshPromise = undefined
  }
  void promise.then(clearRefresh, clearRefresh)
  return promise
}

/** 登录完成后只允许跳转到当前用户实际可访问的站内路由。 */
export function resolveAccessibleRoute(candidate: string): RouteLocationRaw {
  const fallback = '/index'
  let resolved: ReturnType<typeof router.resolve>
  try {
    resolved = router.resolve(candidate)
  } catch {
    return fallback
  }

  const blockedPaths = new Set([
    '/login',
    '/reset-password',
    '/401',
    '/403',
    '/404',
    '/503',
    '/feature-unavailable',
  ])
  if (
    blockedPaths.has(resolved.path) ||
    resolved.matched.length === 0 ||
    resolved.matched.some((record) => record.path === '/:pathMatch(.*)*')
  )
    return fallback

  const user = useUserStore()
  const runtimeCapabilities = useRuntimeCapabilitiesStore()
  const tenantContext = requireApplicationRuntime().getTenantContext()
  const access = matchedRouteAccessResult(
    resolved.matched.map((record) => record.meta),
    {
      capabilities: tenantContext.capabilityCodes,
      multiTenancyEnabled: runtimeCapabilities.multiTenancyEnabled,
      permissions: user.permissions,
    },
  )
  return access === 'allowed' ? resolved.fullPath : fallback
}

const navigationGuard = createNavigationGuard({
  initializeSession: () => requireApplicationRuntime().initializeSession(),
  getUser: useUserStore,
  getPermissionState: usePermissionStore,
  getRuntimeCapabilities: useRuntimeCapabilitiesStore,
  ensureRuntimeCapabilitiesLoaded: () =>
    requireApplicationRuntime().ensureRuntimeCapabilitiesLoaded(),
  getTenantContext: () => requireApplicationRuntime().getTenantContext(),
  ensureTenantContextLoaded: () => requireApplicationRuntime().ensureTenantContextLoaded(),
  ensureAccessibleRoutes,
  clearSession: () => requireApplicationRuntime().clearSession(),
  isKnownRoute: (path) => {
    try {
      return router.resolve(path).matched.some((record) => record.path !== '/:pathMatch(.*)*')
    } catch {
      return false
    }
  },
  resolveReplacement: (path) => {
    const resolved = router.resolve(path)
    return {
      path: resolved.path,
      query: resolved.query,
      hash: resolved.hash,
      replace: true,
    }
  },
})

router.beforeEach((to) => {
  document.title = to.meta?.title ? `${to.meta.title} - RyFrame` : 'RyFrame'
  return navigationGuard(to)
})

export default router
