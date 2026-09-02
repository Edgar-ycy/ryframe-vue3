import { definePageManifest } from '@/features/pages'

export const pageManifest = definePageManifest({
  pages: [
    { routeKey: 'monitor', path: '/monitor' },
    {
      routeKey: 'monitor.overview',
      permissionCode: 'monitor:overview:list',
      path: '/monitor/overview',
      page: () => import('@/views/monitor/overview/index.vue'),
    },
    {
      routeKey: 'monitor.runtime',
      permissionCode: 'monitor:runtime:list',
      path: '/monitor/runtime',
      page: () => import('@/views/monitor/runtime/index.vue'),
    },
    {
      routeKey: 'monitor.online',
      permissionCode: 'monitor:online:list',
      path: '/monitor/online',
      page: () => import('@/views/monitor/online/index.vue'),
    },
    {
      routeKey: 'monitor.server',
      permissionCode: 'monitor:server:list',
      path: '/monitor/server',
      page: () => import('@/views/monitor/server/index.vue'),
    },
    {
      routeKey: 'monitor.cache',
      permissionCode: 'monitor:cache:list',
      path: '/monitor/cache',
      page: () => import('@/views/monitor/cache/index.vue'),
    },
    {
      routeKey: 'monitor.db-pool',
      permissionCode: 'monitor:db-pool:list',
      path: '/monitor/db-pool',
      page: () => import('@/views/monitor/db-pool/index.vue'),
    },
    {
      routeKey: 'monitor.jobs',
      permissionCode: 'monitor:job:list',
      path: '/monitor/jobs',
      page: () => import('@/views/monitor/jobs/index.vue'),
    },
    {
      routeKey: 'monitor.schedules',
      permissionCode: 'monitor:schedule:list',
      path: '/monitor/schedules',
      page: () => import('@/views/monitor/schedules/index.vue'),
    },
    {
      routeKey: 'monitor.retention',
      permissionCode: 'monitor:retention:list',
      path: '/monitor/retention',
      page: () => import('@/views/monitor/retention/index.vue'),
    },
  ],
})
