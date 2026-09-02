import type { RouteRecordRaw } from 'vue-router'
import type { RouteProjection, RouteProjectionMeta } from '@/shared/navigation/routeProjection'

function projectMeta(meta: RouteRecordRaw['meta']): RouteProjectionMeta | undefined {
  if (!meta) return undefined
  return {
    title: meta.title,
    icon: meta.icon,
    hidden: meta.hidden,
    affix: meta.affix,
    alwaysShow: meta.alwaysShow,
    permission: meta.permission,
    activeMenu: meta.activeMenu,
    noCache: meta.noCache,
    sort: meta.sort,
    isFrame: meta.isFrame,
    buttonPerms: meta.buttonPerms,
    requiresPermission: meta.requiresPermission,
    requiresMultiTenancy: meta.requiresMultiTenancy,
    requiredCapabilities: meta.requiredCapabilities,
  }
}

function projectRecord(route: RouteRecordRaw): RouteProjection {
  if (route.redirect !== undefined && typeof route.redirect !== 'string') {
    throw new Error(`固定路由 ${route.path} 使用了投影不支持的非字符串重定向`)
  }
  return {
    path: route.path,
    name: route.name,
    redirect: route.redirect,
    component: route.component ?? undefined,
    meta: projectMeta(route.meta),
    children: route.children?.map(projectRecord),
  }
}

/** Router 在组合根把固定路由缩减为 Store 可持有的中立投影。 */
export function projectRouteRecords(routes: readonly RouteRecordRaw[]): RouteProjection[] {
  return routes.map(projectRecord)
}

function restoreRecord(route: RouteProjection): RouteRecordRaw {
  return {
    path: route.path,
    name: route.name,
    redirect: route.redirect,
    component: route.component,
    meta: route.meta,
    children: route.children?.map(restoreRecord),
  } as RouteRecordRaw
}

/** 只有 Router 安装动态路由时才恢复为 vue-router 的记录类型。 */
export function restoreRouteRecords(routes: readonly RouteProjection[]): RouteRecordRaw[] {
  return routes.map(restoreRecord)
}
