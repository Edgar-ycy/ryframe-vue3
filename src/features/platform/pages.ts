import { definePageManifest } from '@/features/pages'

export const pageManifest = definePageManifest({
  pages: [
    { routeKey: 'platform', path: '/platform' },
    {
      routeKey: 'platform.product-plans',
      permissionCode: 'platform:product-plan:list',
      path: '/platform/product-plans',
      page: () => import('@/views/platform/product-plans/index.vue'),
      catalogs: [
        () => import('@/i18n/catalog/product-plans').then(module => module.messageCatalog),
      ],
    },
    {
      routeKey: 'platform.data-targets',
      permissionCode: 'tenant:data-placement:view',
      path: '/platform/data-targets',
      page: () => import('@/views/platform/data-targets/index.vue'),
      catalogs: [
        () => import('@/i18n/catalog/tenant-data').then(module => module.messageCatalog),
      ],
    },
    {
      routeKey: 'platform.tenant',
      permissionCode: 'tenant:list',
      path: '/platform/tenants',
      page: () => import('@/views/platform/tenant/index.vue'),
      catalogs: [
        () => import('@/i18n/catalog/product-plans').then(module => module.messageCatalog),
        () => import('@/i18n/catalog/tenant-capacity').then(module => module.messageCatalog),
        () => import('@/i18n/catalog/tenant-data').then(module => module.messageCatalog),
      ],
    },
  ],
})
