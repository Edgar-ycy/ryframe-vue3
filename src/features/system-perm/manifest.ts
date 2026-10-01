import { defineFeatureManifest } from '@/features/manifest'

export const featureManifest = defineFeatureManifest({
  capabilityCode: 'system.perm',
  routeKey: 'system.perm',
  permissionCode: 'system:perm:list',
  path: '/system/permission',
  page: () => import('@/views/system/permission/index.vue'),
  allowedVariants: ['standard'],
  planConfigEditor: () => import('../StandardPlanConfigEditor.vue'),
  businessWritePermissions: [],
})
