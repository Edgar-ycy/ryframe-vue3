import { definePageManifest } from '@/features/pages'

export const pageManifest = definePageManifest({
  pages: [
    {
      routeKey: 'home',
      path: '/index',
      page: () => import('@/views/index.vue'),
      catalogs: [
        () => import('@/i18n/catalog/platform-operations').then((module) => module.messageCatalog),
      ],
    },
  ],
})
