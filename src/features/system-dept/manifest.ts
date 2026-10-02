import { defineFeatureManifest } from '@/features/manifest'

export const featureManifest = defineFeatureManifest({
  capabilityCode: 'system.dept',
  routeKey: 'system.dept',
  permissionCode: 'system:dept:list',
  path: '/system/dept',
  page: () => import('@/views/system/dept/index.vue'),
  allowedVariants: ['standard'],
  planConfigEditor: () => import('../StandardPlanConfigEditor.vue'),
  businessWritePermissions: [],
})
