import { defineFeatureManifest } from '@/features/manifest'

export const featureManifest = defineFeatureManifest({
  capabilityCode: 'system.role',
  routeKey: 'system.role',
  permissionCode: 'system:role:list',
  path: '/system/role',
  page: () => import('@/views/system/role/index.vue'),
  allowedVariants: ['standard'],
  planConfigEditor: () => import('../StandardPlanConfigEditor.vue'),
  businessWritePermissions: [],
})
