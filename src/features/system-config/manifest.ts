import { defineFeatureManifest } from '@/features/manifest'

export const featureManifest = defineFeatureManifest({
  capabilityCode: 'system.config',
  routeKey: 'system.config',
  permissionCode: 'system:config:list',
  path: '/system/config',
  page: () => import('@/views/system/config/index.vue'),
  allowedVariants: ['standard'],
  planConfigEditor: () => import('../StandardPlanConfigEditor.vue'),
  businessWritePermissions: [],
})
