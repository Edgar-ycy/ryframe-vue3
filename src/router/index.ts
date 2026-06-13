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
 * 从后端菜单树生成动态路由（纯数据库驱动，无静态降级）
 */
async function fetchMenuAndGenerateRoutes(permissionStore: ReturnType<typeof usePermissionStore>): Promise<RouteRecordRaw[]> {
  const menuRes = await getUserMenus() as any
  const menuTree = menuRes.rows || menuRes.data || menuRes || []
  console.log('[Router] 通过 /system/menus/user-tree 获取菜单树，生成动态路由')
  return permissionStore.generateRoutes(menuTree)
}

// 全局前置守卫
router.beforeEach(async (to, from) => {
  document.title = `${to.meta?.title || ''} - RyFrame`

  const userStore = useUserStore()
  const permissionStore = usePermissionStore()

  if (userStore.token) {
    // 已登录
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
        const accessRoutes = await fetchMenuAndGenerateRoutes(permissionStore)
        // 3. 注册到 Vue Router（作为顶层路由添加）
        for (const route of accessRoutes) {
          router.addRoute(route as RouteRecordRaw)
        }
        // 4. 重新导航：replace 当前历史记录，避免回退到登录页
        //    若当前路由是由 catch-all (/:pathMatch(.*)*) 重定向而来，
        //    则回到原始目标路径（此时动态路由已注册，可正确匹配）
        const targetPath = (to.redirectedFrom as any)?.fullPath || to.path
        return { path: targetPath, query: to.query, replace: true }
      } catch (error) {
        await userStore.logout()
        return `/login?redirect=${to.path}`
      }
    }
    // 已加载路由，放行
    return true
  }

  // 未登录
  if (whiteList.includes(to.path)) {
    return true
  }
  return `/login?redirect=${to.path}`
})

export default router
