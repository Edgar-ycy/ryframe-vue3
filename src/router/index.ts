import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from 'vue-router'
import { constantRoutes } from './routes/constant'
import { useUserStore } from '@/stores/user'
import { usePermissionStore } from '@/stores/permission'
import { getUserMenus } from '@/api/modules/menu'
import { clearSession, initializeSession } from '@/app/session/sessionCoordinator'
import { RuntimeRouteRegistry } from './runtimeRouteRegistry'
import { createNavigationGuard } from './navigationGuard'

// 扩展 vue-router 的 RouteMeta
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
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: constantRoutes,
  scrollBehavior: () => ({ top: 0 }),
})

const runtimeRouteRegistry = new RuntimeRouteRegistry(router)

/**
 * 从后端菜单树生成动态路由（纯数据库驱动，无静态降级）
 */
async function fetchMenuAndGenerateRoutes(
  permissionStore: ReturnType<typeof usePermissionStore>,
  options?: { skipAuthRefresh?: boolean },
): Promise<RouteRecordRaw[]> {
  const menuRes = await getUserMenus(options)
  const menuTree = menuRes.data ?? menuRes.rows ?? []
  const userStore = useUserStore()
  return permissionStore.generateRoutes(menuTree, userStore.permissions, userStore.roles)
}

/** 注册动态路由（catch-all 已在 constantRoutes 中，无需在此追加） */
export function resetDynamicRoutes() {
  runtimeRouteRegistry.reset()
}

export async function refreshAccessibleRoutes(options?: { skipAuthRefresh?: boolean }) {
  const permissionStore = usePermissionStore()
  resetDynamicRoutes()
  permissionStore.resetRoutes()
  const accessRoutes = await fetchMenuAndGenerateRoutes(permissionStore, options)
  runtimeRouteRegistry.add(accessRoutes)
  return accessRoutes
}

const navigationGuard = createNavigationGuard({
  initializeSession,
  getUser: useUserStore,
  getPermissionState: usePermissionStore,
  refreshAccessibleRoutes,
  clearSession,
  isKnownRoute: (path) => router.resolve(path).matched
    .some(record => record.path !== '/:pathMatch(.*)*'),
})

// 全局前置守卫
// 使用 Vue Router 的 return 模式，避免命令式 next(location) 分支遗漏。
router.beforeEach((to) => {
  document.title = `${to.meta?.title || ''} - RyFrame`
  return navigationGuard(to)
})

export default router
