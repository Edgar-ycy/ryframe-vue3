import { definePageManifest } from '@/features/pages'

export const pageManifest = definePageManifest({
  pages: [
    { routeKey: 'system', path: '/system' },
    {
      routeKey: 'system.user',
      permissionCode: 'system:user:list',
      path: '/system/user',
      page: () => import('@/views/system/user/index.vue'),
      catalogs: [
        () => import('@/i18n/catalog/platform-operations').then(module => module.messageCatalog),
      ],
    },
    { routeKey: 'system.role', permissionCode: 'system:role:list', path: '/system/role', page: () => import('@/views/system/role/index.vue') },
    { routeKey: 'system.menu', permissionCode: 'system:menu:list', path: '/system/menu', page: () => import('@/views/system/menu/index.vue') },
    { routeKey: 'system.dept', permissionCode: 'system:dept:list', path: '/system/dept', page: () => import('@/views/system/dept/index.vue') },
    { routeKey: 'system.dict', permissionCode: 'system:dict:list', path: '/system/dict', page: () => import('@/views/system/dict/index.vue') },
    { routeKey: 'system.config', permissionCode: 'system:config:list', path: '/system/config', page: () => import('@/views/system/config/index.vue') },
    {
      routeKey: 'system.config-transfer',
      permissionCode: 'system:config-transfer:list',
      path: '/system/config-transfer',
      page: () => import('@/views/system/config-transfer/index.vue'),
      catalogs: [
        () => import('@/i18n/catalog/tenant-config-transfer').then(module => module.messageCatalog),
      ],
    },
    { routeKey: 'system.notice', permissionCode: 'system:notice:list', path: '/system/notice', page: () => import('@/views/system/notice/index.vue') },
    { routeKey: 'system.operlog', permissionCode: 'system:operlog:list', path: '/system/operlog', page: () => import('@/views/monitor/operlog/index.vue') },
    { routeKey: 'system.logininfor', permissionCode: 'system:logininfor:list', path: '/system/logininfor', page: () => import('@/views/monitor/loginlog/index.vue') },
    { routeKey: 'system.perm', permissionCode: 'system:perm:list', path: '/system/permission', page: () => import('@/views/system/permission/index.vue') },
    {
      routeKey: 'system.authorization-diagnostics',
      permissionCode: 'system:authorization-diagnostic:list',
      path: '/system/authorization-diagnostics',
      page: () => import('@/views/system/authorization-diagnostics/index.vue'),
      catalogs: [
        () => import('@/i18n/catalog/platform-operations').then(module => module.messageCatalog),
      ],
    },
  ],
})
