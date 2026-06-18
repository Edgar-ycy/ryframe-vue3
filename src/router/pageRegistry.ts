type ComponentLoader = () => Promise<any>

export interface MenuPageRegistryEntry {
  path: string
  component?: ComponentLoader
}

export const menuPageRegistry: Record<string, MenuPageRegistryEntry> = {
  '0': { path: '/index', component: () => import('@/views/index.vue') },

  '1': { path: '/system' },
  '2': { path: '/monitor' },
  '3': { path: '/tools' },

  '4': { path: '/system/user', component: () => import('@/views/system/user/index.vue') },
  '5': { path: '/system/role', component: () => import('@/views/system/role/index.vue') },
  '6': { path: '/system/menu', component: () => import('@/views/system/menu/index.vue') },
  '7': { path: '/system/dept', component: () => import('@/views/system/dept/index.vue') },
  '8': { path: '/system/post', component: () => import('@/views/system/post/index.vue') },
  '9': { path: '/system/dict', component: () => import('@/views/system/dict/index.vue') },
  '10': { path: '/system/config', component: () => import('@/views/system/config/index.vue') },
  '11': { path: '/system/notice', component: () => import('@/views/system/notice/index.vue') },
  '12': { path: '/system/operlog', component: () => import('@/views/monitor/operlog/index.vue') },
  '13': { path: '/system/logininfor', component: () => import('@/views/monitor/loginlog/index.vue') },
  '25': { path: '/system/permission', component: () => import('@/views/system/permission/index.vue') },

  '14': { path: '/monitor/runtime', component: () => import('@/views/monitor/runtime/index.vue') },
  '15': { path: '/monitor/online', component: () => import('@/views/monitor/online/index.vue') },
  '16': { path: '/monitor/server', component: () => import('@/views/monitor/server/index.vue') },
  '23': { path: '/monitor/cache', component: () => import('@/views/monitor/cache/index.vue') },
  '24': { path: '/monitor/db-pool', component: () => import('@/views/monitor/db-pool/index.vue') },

  '17': { path: '/tools/gen', component: () => import('@/views/tools/gen/index.vue') },
}

export function getMenuPage(menuId: string | number): MenuPageRegistryEntry | undefined {
  return menuPageRegistry[String(menuId)]
}
