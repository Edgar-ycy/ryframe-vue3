import { defineFeatureManifest } from '@/features/manifest'

export const featureManifest = defineFeatureManifest({
  capabilityCode: 'system.authorization-diagnostics',
  routeKey: 'system.authorization-diagnostics',
  permissionCode: 'system:authorization-diagnostic:list',
  path: '/system/authorization-diagnostics',
  page: () => import('@/views/system/authorization-diagnostics/index.vue'),
  allowedVariants: ['standard'],
  planConfigEditor: () => import('../StandardPlanConfigEditor.vue'),
  businessWritePermissions: [],
})
