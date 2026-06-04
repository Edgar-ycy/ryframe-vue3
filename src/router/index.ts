import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { constantRoutes } from './routes/constant'
import { useUserStore } from '@/stores/user'
import { usePermissionStore } from '@/stores/permission'
import { getUserMenus } from '@/api/modules/menu'

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

// 白名单：无需登录即可访问
const whiteList = ['/login']

/**
 * 获取菜单并生成路由
 * 依次尝试多个端点，最终降级到权限码过滤静态路由
 */
async function fetchMenuAndGenerateRoutes(permissionStore: ReturnType<typeof usePermissionStore>, userStore: ReturnType<typeof useUserStore>): Promise<RouteRecordRaw[]> {
  // 端点列表：依次尝试，任一成功即停止
  const endpoints: Array<{ name: string; fn: () => Promise<any> }> = [
    { name: '/system/menus/tree', fn: getUserMenus },
  ]

  for (const ep of endpoints) {
    try {
      const menuRes = await ep.fn() as any
      const menuTree = menuRes.rows || menuRes.data || menuRes || []
      if (Array.isArray(menuTree) && menuTree.length > 0) {
        console.log(`[Router] 通过 ${ep.name} 获取菜单树，生成动态路由`)
        return permissionStore.generateRoutes(menuTree)
      }
    } catch (e) {
      console.warn(`[Router] ${ep.name} 不可用:`, (e as Error).message)
    }
  }

  // 全部端点失败 → 降级到静态路由 + 权限过滤
  console.log('[Router] 降级模式：根据权限码过滤静态路由')
  return permissionStore.generateRoutesFallback(userStore.permissions)
}

// 全局前置守卫
router.beforeEach(async (to, from, next) => {
  document.title = `${to.meta?.title || ''} - RyFrame`

  const userStore = useUserStore()
  const permissionStore = usePermissionStore()

  if (userStore.token) {
    // 已登录
    if (to.path === '/login') {
      next({ path: '/' })
      return
    }

    // 首次加载：动态路由未生成则请求用户信息 + 菜单树
    if (!permissionStore.isRoutesLoaded) {
      try {
        // 1. 获取用户基本信息 + 权限码
        if (!userStore.permissions.length) {
          await userStore.getUserInfo()
        }
        // 2. 获取菜单并生成路由（优先数据库菜单，失败降级为权限过滤）
        const accessRoutes = await fetchMenuAndGenerateRoutes(permissionStore, userStore)
        // 3. 注册到 Vue Router（作为顶层路由添加）
        for (const route of accessRoutes) {
          router.addRoute(route as RouteRecordRaw)
        }
        // 4. 重新导航：replace 当前历史记录，避免回退到登录页
        //    若当前路由是由 catch-all (/:pathMatch(.*)*) 重定向而来，
        //    则回到原始目标路径（此时动态路由已注册，可正确匹配）
        const targetPath = (to.redirectedFrom as any)?.fullPath || to.path
        next({ path: targetPath, query: to.query, replace: true })
      } catch (error) {
        await userStore.logout()
        next(`/login?redirect=${to.path}`)
      }
    } else {
      next()
    }
  } else {
    if (whiteList.includes(to.path)) {
      next()
    } else {
      next(`/login?redirect=${to.path}`)
    }
  }
})

export default router
