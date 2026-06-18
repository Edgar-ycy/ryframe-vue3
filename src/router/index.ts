import {createRouter, createWebHistory, type RouteRecordRaw} from 'vue-router'
import {constantRoutes} from './routes/constant'
import {useUserStore} from '@/stores/user'
import {usePermissionStore} from '@/stores/permission'
import {getUserMenus} from '@/api/modules/menu'

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
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: constantRoutes,
  scrollBehavior: () => ({ top: 0 }),
})

const dynamicRouteNames = new Set<string | symbol>()

// 白名单：无需登录即可访问
const whiteList = ['/login', '/reset-password']

/**
 * 从后端菜单树生成动态路由（纯数据库驱动，无静态降级）
 */
async function fetchMenuAndGenerateRoutes(permissionStore: ReturnType<typeof usePermissionStore>): Promise<RouteRecordRaw[]> {
  const menuRes = await getUserMenus() as any
  const menuTree = menuRes.rows || menuRes.data || menuRes || []
  return permissionStore.generateRoutes(menuTree)
}

/** 注册动态路由（catch-all 已在 constantRoutes 中，无需在此追加） */
function addRuntimeRoutes(routes: RouteRecordRaw[]) {
  for (const route of routes) {
    if (route.name && router.hasRoute(route.name)) continue
    router.addRoute(route)
    if (route.name) dynamicRouteNames.add(route.name)
  }
}

export function resetDynamicRoutes() {
  for (const name of dynamicRouteNames) {
    if (router.hasRoute(name)) router.removeRoute(name)
  }
  dynamicRouteNames.clear()
}

export async function refreshAccessibleRoutes() {
  const permissionStore = usePermissionStore()
  resetDynamicRoutes()
  permissionStore.resetRoutes()
  const accessRoutes = await fetchMenuAndGenerateRoutes(permissionStore)
  addRuntimeRoutes(accessRoutes)
  return accessRoutes
}

function getOriginalFullPath(to: any): string {
  return to.redirectedFrom?.fullPath || to.fullPath || to.path || '/'
}

// 全局前置守卫
// 使用 Vue Router 4 推荐的 return 模式，而非已废弃的 next(location)
router.beforeEach(async (to, from) => {
  document.title = `${to.meta?.title || ''} - RyFrame`

  const userStore = useUserStore()
  const permissionStore = usePermissionStore()

  if (userStore.token) {
    // 已登录 → 访问登录页则重定向到首页
    if (to.path === '/login') {
      return { path: '/' }
    }

    // 首次加载：动态路由未生成则请求用户信息 + 菜单树
    if (!permissionStore.isRoutesLoaded) {
      try {
        // 1. 获取用户基本信息 + 权限码
        if (!userStore.permissions.length) {
          await userStore.getUserInfo()
        }
        // 2. 获取菜单并生成路由
        await refreshAccessibleRoutes()
        // 4. 重新导航到原始目标（此时动态路由已注册，可正确匹配）
        return { path: getOriginalFullPath(to), replace: true }
      } catch (_error) {
        await userStore.logout()
        return { path: '/login', query: { redirect: getOriginalFullPath(to) } }
      }
    }
    // 路由已加载，正常放行
    return true
  } else {
    // 未登录：白名单放行，其余重定向到登录页
    if (whiteList.includes(to.path)) {
      return true
    }
    return { path: '/login', query: { redirect: getOriginalFullPath(to) } }
  }
})

export default router
