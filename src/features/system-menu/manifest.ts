import { defineFeatureManifest } from '@/features/manifest'

export const featureManifest = defineFeatureManifest({
  capabilityCode: 'system.menu',
  routeKey: 'system.menu',
  permissionCode: 'system:menu:list',
  path: '/system/menu',
  page: () => import('@/views/system/menu/index.vue'),
  allowedVariants: ['standard'],
  planConfigEditor: () => import('../StandardPlanConfigEditor.vue'),
  businessWritePermissions: [],
})
