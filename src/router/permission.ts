import type { RouteRecordRaw } from 'vue-router'

/**
 * 判断用户是否拥有访问该路由的权限
 */
export function hasPermission(permissions: string[], route: RouteRecordRaw): boolean {
  if (route.meta && route.meta.permission) {
    return permissions.includes(route.meta.permission as string)
  }
  return true
}

/**
 * 根据用户权限过滤动态路由（降级方案）
 *
 * 当后端菜单 API（/system/menus/user）不可用时，
 * 使用此函数从静态路由模块中过滤出用户有权访问的路由。
 */
export function filterAsyncRoutes(routes: RouteRecordRaw[], permissions: string[]): RouteRecordRaw[] {
  const result: RouteRecordRaw[] = []

  routes.forEach(route => {
    const tmp = { ...route }
    if (hasPermission(permissions, tmp)) {
      if (tmp.children) {
        tmp.children = filterAsyncRoutes(tmp.children, permissions)
      }
      result.push(tmp)
    }
  })

  return result
}
