import {
  createRouter,
  createWebHistory,
  type RouteLocationRaw,
  type RouteRecordRaw,
} from 'vue-router'
import { getUserMenus } from '@/api/modules/menu'
import { clearSession, initializeSession } from '@/app/session/sessionCoordinator'
import { usePermissionStore } from '@/stores/permission'
import { useRuntimeCapabilitiesStore } from '@/stores/runtimeCapabilities'
import { useUserStore } from '@/stores/user'
import { hasPermission } from '@/utils/permission'
import { ROOT_LAYOUT_ROUTE_NAME } from './layout'
import { createNavigationGuard } from './navigationGuard'
import { RuntimeRouteRegistry } from './runtimeRouteRegistry'
import { constantRoutes } from './routes/constant'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    icon?: string
    hidden?: boolean
    affix?: boolean
    alwaysShow?: boolean
    permission?: string
    activeMenu?: string
    noCache?: boolean
    sort?: number
    isFrame?: boolean
    buttonPerms?: string[]
    requiresPermission?: boolean
    requiresMultiTenancy?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: constantRoutes,
  scrollBehavior: () => ({ top: 0 }),
})

const runtimeRouteRegistry = new RuntimeRouteRegistry(router)

interface RouteInstallation {
  generation: number
  promise: Promise<RouteRecordRaw[]>
}

let routeGeneration = 0
let routeInstallation: RouteInstallation | undefined
let routeRefreshPromise: Promise<RouteRecordRaw[]> | undefined

async function buildAccessibleRoutes(
  generation: number,
  options?: { skipAuthRefresh?: boolean },
): Promise<RouteRecordRaw[] | undefined> {
  const menuRes = await getUserMenus(options)
  if (generation !== routeGeneration) return undefined

  const permissionStore = usePermissionStore()
  const userStore = useUserStore()
  return permissionStore.generateRoutes(
    menuRes.data ?? [],
    userStore.permissions,
    userStore.roles,
  )
}

/**
 * 确保当前会话的动态路由只安装一次；同一代际中的并发调用共享同一个请求。
 */
export function ensureAccessibleRoutes(
  options?: { skipAuthRefresh?: boolean },
): Promise<RouteRecordRaw[]> {
  const permissionStore = usePermissionStore()
  if (permissionStore.isRoutesLoaded) return Promise.resolve(permissionStore.routes)

  const generation = routeGeneration
  if (routeInstallation?.generation === generation) return routeInstallation.promise

  const promise = (async () => {
    try {
      const routes = await buildAccessibleRoutes(generation, options)
      if (!routes || generation !== routeGeneration) return []
      runtimeRouteRegistry.add(ROOT_LAYOUT_ROUTE_NAME, routes)
      return routes
    }
    catch (error) {
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
  runtimeRouteRegistry.reset()
}

/** 强制重新读取权限；并发刷新仍然合并为一次。 */
export function refreshAccessibleRoutes(
  options?: { skipAuthRefresh?: boolean },
): Promise<RouteRecordRaw[]> {
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
  }
  catch {
    return fallback
  }

  const blockedPaths = new Set(['/login', '/reset-password', '/401', '/403', '/404', '/500'])
  if (
    blockedPaths.has(resolved.path)
    || resolved.matched.length === 0
    || resolved.matched.some(record => record.path === '/:pathMatch(.*)*')
  ) return fallback

  const user = useUserStore()
  const runtimeCapabilities = useRuntimeCapabilitiesStore()
  const accessible = resolved.matched.every((record) => {
    if (record.meta.requiresMultiTenancy && !runtimeCapabilities.multiTenancyEnabled) return false
    if (!record.meta.requiresPermission) return true
    const permission = record.meta.permission
    return typeof permission === 'string'
      && hasPermission(user.permissions, permission, user.roles)
  })
  return accessible ? resolved.fullPath : fallback
}

const navigationGuard = createNavigationGuard({
  initializeSession,
  getUser: useUserStore,
  getPermissionState: usePermissionStore,
  getRuntimeCapabilities: useRuntimeCapabilitiesStore,
  ensureAccessibleRoutes,
  clearSession,
  isKnownRoute: (path) => {
    try {
      return router.resolve(path).matched
        .some(record => record.path !== '/:pathMatch(.*)*')
    }
    catch {
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
