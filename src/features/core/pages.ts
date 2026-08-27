import { definePageManifest } from '@/features/pages'

export const pageManifest = definePageManifest({
  pages: [
    {
      routeKey: 'home',
      path: '/index',
      page: () => import('@/views/index.vue'),
    },
  ],
})
