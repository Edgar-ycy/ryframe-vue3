import { defineFeatureManifest } from '@/features/manifest'

export const featureManifest = defineFeatureManifest({
  capabilityCode: 'system.user',
  routeKey: 'system.user',
  permissionCode: 'system:user:list',
  path: '/system/user',
  page: () => import('@/views/system/user/index.vue'),
  allowedVariants: ['standard'],
  planConfigEditor: () => import('../StandardPlanConfigEditor.vue'),
  businessWritePermissions: [],
})
