import { defineFeatureManifest } from '@/features/manifest'

export const featureManifest = defineFeatureManifest({
  capabilityCode: 'system.operlog',
  routeKey: 'system.operlog',
  permissionCode: 'system:operlog:list',
  path: '/system/operlog',
  page: () => import('@/views/monitor/operlog/index.vue'),
  allowedVariants: ['standard'],
  planConfigEditor: () => import('../StandardPlanConfigEditor.vue'),
  businessWritePermissions: [],
})
