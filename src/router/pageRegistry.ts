import type { RouteComponentLoader } from '@/router/namedRouteComponent'
import {
  isPermissionCode,
  type PermissionCode,
} from '@/api/generated/permissions'
import {
  featureMenuPageRegistry,
  featurePermissionRouteKeys,
} from '@/features/registry'

export interface MenuPageRegistryEntry {
  path: string
  component?: RouteComponentLoader
  requiredCapabilities?: readonly string[]
}

export interface RegisteredMenuPage extends MenuPageRegistryEntry {
  routeKey: string
  permission?: PermissionCode
}

export const menuPageRegistry: Record<string, MenuPageRegistryEntry> = {
  home: { path: '/index', component: () => import('@/views/index.vue') },

  system: { path: '/system' },
  monitor: { path: '/monitor' },
  platform: { path: '/platform' },

  'system.user': { path: '/system/user', component: () => import('@/views/system/user/index.vue') },
  'system.role': { path: '/system/role', component: () => import('@/views/system/role/index.vue') },
  'system.menu': { path: '/system/menu', component: () => import('@/views/system/menu/index.vue') },
  'system.dept': { path: '/system/dept', component: () => import('@/views/system/dept/index.vue') },
  'system.post': { path: '/system/post', component: () => import('@/views/system/post/index.vue') },
  'system.dict': { path: '/system/dict', component: () => import('@/views/system/dict/index.vue') },
  'system.config': { path: '/system/config', component: () => import('@/views/system/config/index.vue') },
  'system.config-transfer': { path: '/system/config-transfer', component: () => import('@/views/system/config-transfer/index.vue') },
  'system.notice': { path: '/system/notice', component: () => import('@/views/system/notice/index.vue') },
  'system.operlog': { path: '/system/operlog', component: () => import('@/views/monitor/operlog/index.vue') },
  'system.logininfor': { path: '/system/logininfor', component: () => import('@/views/monitor/loginlog/index.vue') },
  'system.perm': { path: '/system/permission', component: () => import('@/views/system/permission/index.vue') },
  'system.authorization-diagnostics': { path: '/system/authorization-diagnostics', component: () => import('@/views/system/authorization-diagnostics/index.vue') },
  ...featureMenuPageRegistry,

  'platform.product-plans': {
    path: '/platform/product-plans',
    component: () => import('@/views/platform/product-plans/index.vue'),
  },
  'platform.data-targets': {
    path: '/platform/data-targets',
    component: () => import('@/views/platform/data-targets/index.vue'),
  },
  'platform.tenant': {
    path: '/platform/tenants',
    component: () => import('@/views/platform/tenant/index.vue'),
  },

  'monitor.overview': { path: '/monitor/overview', component: () => import('@/views/monitor/overview/index.vue') },
  'monitor.runtime': { path: '/monitor/runtime', component: () => import('@/views/monitor/runtime/index.vue') },
  'monitor.online': { path: '/monitor/online', component: () => import('@/views/monitor/online/index.vue') },
  'monitor.server': { path: '/monitor/server', component: () => import('@/views/monitor/server/index.vue') },
  'monitor.cache': { path: '/monitor/cache', component: () => import('@/views/monitor/cache/index.vue') },
  'monitor.db-pool': { path: '/monitor/db-pool', component: () => import('@/views/monitor/db-pool/index.vue') },
  'monitor.jobs': { path: '/monitor/jobs', component: () => import('@/views/monitor/jobs/index.vue') },
  'monitor.schedules': { path: '/monitor/schedules', component: () => import('@/views/monitor/schedules/index.vue') },
  'monitor.retention': { path: '/monitor/retention', component: () => import('@/views/monitor/retention/index.vue') },
}

export function getMenuPage(routeKey?: string | null): MenuPageRegistryEntry | undefined {
  return routeKey ? menuPageRegistry[routeKey] : undefined
}

export const permissionRouteKeys: Readonly<Partial<Record<PermissionCode, string>>> = Object.freeze({
  'system:user:list': 'system.user',
  'system:role:list': 'system.role',
  'system:menu:list': 'system.menu',
  'system:dept:list': 'system.dept',
  'system:post:list': 'system.post',
  'system:dict:list': 'system.dict',
  'system:config:list': 'system.config',
  'system:config-transfer:list': 'system.config-transfer',
  'system:notice:list': 'system.notice',
  'system:operlog:list': 'system.operlog',
  'system:logininfor:list': 'system.logininfor',
  'system:perm:list': 'system.perm',
  'system:authorization-diagnostic:list': 'system.authorization-diagnostics',
  ...featurePermissionRouteKeys,
  'platform:product-plan:list': 'platform.product-plans',
  'tenant:data-placement:view': 'platform.data-targets',
  'tenant:list': 'platform.tenant',
  'monitor:overview:list': 'monitor.overview',
  'monitor:runtime:list': 'monitor.runtime',
  'monitor:online:list': 'monitor.online',
  'monitor:server:list': 'monitor.server',
  'monitor:cache:list': 'monitor.cache',
  'monitor:db-pool:list': 'monitor.db-pool',
  'monitor:job:list': 'monitor.jobs',
  'monitor:schedule:list': 'monitor.schedules',
  'monitor:retention:list': 'monitor.retention',
})

export function getRouteKeyByPermissionCode(permissionCode?: PermissionCode | null): string | undefined {
  return permissionCode ? permissionRouteKeys[permissionCode] : undefined
}

export function getMenuPageByPath(path: string): RegisteredMenuPage | undefined {
  const normalized = normalizePagePath(path)
  for (const [routeKey, page] of Object.entries(menuPageRegistry)) {
    if (normalizePagePath(page.path) !== normalized) continue
    return {
      ...page,
      permission: permissionForRouteKey(routeKey),
      routeKey,
    }
  }
  return undefined
}

function permissionForRouteKey(routeKey: string): PermissionCode | undefined {
  for (const [permission, mappedRouteKey] of Object.entries(permissionRouteKeys)) {
    if (mappedRouteKey === routeKey && isPermissionCode(permission)) return permission
  }
  return undefined
}

function normalizePagePath(value: string): string {
  const path = value.split(/[?#]/u, 1)[0]?.replace(/\/+$/u, '') || '/'
  return path.startsWith('/') ? path : `/${path}`
}
