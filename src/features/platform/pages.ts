import { definePageManifest } from '@/features/pages'

export const pageManifest = definePageManifest({
  pages: [
    { routeKey: 'platform', path: '/platform' },
    {
      routeKey: 'platform.product-plans',
      requiresMultiTenancy: true,
      permissionCode: 'platform:product-plan:list',
      path: '/platform/product-plans',
      page: () => import('@/views/platform/product-plans/index.vue'),
    },
    {
      routeKey: 'platform.data-targets',
      permissionCode: 'tenant:data-placement:view',
      path: '/platform/data-targets',
      page: () => import('@/views/platform/data-targets/index.vue'),
    },
    {
      routeKey: 'platform.tenant',
      requiresMultiTenancy: true,
      permissionCode: 'tenant:list',
      path: '/platform/tenants',
      page: () => import('@/views/platform/tenant/index.vue'),
    },
    {
      routeKey: 'platform.config-transfer',
      permissionCode: 'platform:config-transfer:list',
      path: '/platform/config-transfer',
      page: () => import('@/views/platform/config-transfer/index.vue'),
    },
  ],
})
