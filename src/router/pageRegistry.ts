import type { RouteComponentLoader } from '@/router/namedRouteComponent'

export interface MenuPageRegistryEntry {
  path: string
  component?: RouteComponentLoader
}

export const menuPageRegistry: Record<string, MenuPageRegistryEntry> = {
  home: { path: '/index', component: () => import('@/views/index.vue') },

  system: { path: '/system' },
  monitor: { path: '/monitor' },
  tools: { path: '/tools' },

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

  'monitor.overview': { path: '/monitor/overview', component: () => import('@/views/monitor/overview/index.vue') },
  'monitor.runtime': { path: '/monitor/runtime', component: () => import('@/views/monitor/runtime/index.vue') },
  'monitor.online': { path: '/monitor/online', component: () => import('@/views/monitor/online/index.vue') },
  'monitor.server': { path: '/monitor/server', component: () => import('@/views/monitor/server/index.vue') },
  'monitor.cache': { path: '/monitor/cache', component: () => import('@/views/monitor/cache/index.vue') },
  'monitor.db-pool': { path: '/monitor/db-pool', component: () => import('@/views/monitor/db-pool/index.vue') },
  'monitor.jobs': { path: '/monitor/jobs', component: () => import('@/views/monitor/jobs/index.vue') },
  'monitor.schedules': { path: '/monitor/schedules', component: () => import('@/views/monitor/schedules/index.vue') },
  'monitor.retention': { path: '/monitor/retention', component: () => import('@/views/monitor/retention/index.vue') },

  'tools.gen': { path: '/tools/gen', component: () => import('@/views/tools/gen/index.vue') },
}

export function getMenuPage(routeKey?: string | null): MenuPageRegistryEntry | undefined {
  return routeKey ? menuPageRegistry[routeKey] : undefined
}

export const permissionRouteKeys: Readonly<Record<string, string>> = Object.freeze({
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
  'monitor:overview:list': 'monitor.overview',
  'monitor:runtime:list': 'monitor.runtime',
  'monitor:online:list': 'monitor.online',
  'monitor:server:list': 'monitor.server',
  'monitor:cache:list': 'monitor.cache',
  'monitor:db-pool:list': 'monitor.db-pool',
  'monitor:job:list': 'monitor.jobs',
  'monitor:schedule:list': 'monitor.schedules',
  'monitor:retention:list': 'monitor.retention',
  'tools:gen:list': 'tools.gen',
})

export function getRouteKeyByPermissionCode(permissionCode?: string | null): string | undefined {
  return permissionCode ? permissionRouteKeys[permissionCode] : undefined
}
