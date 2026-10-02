import { defineFeatureManifest } from '@/features/manifest'

export const featureManifest = defineFeatureManifest({
  capabilityCode: 'system.logininfor',
  routeKey: 'system.logininfor',
  permissionCode: 'system:logininfor:list',
  path: '/system/logininfor',
  page: () => import('@/views/monitor/loginlog/index.vue'),
  allowedVariants: ['standard'],
  planConfigEditor: () => import('../StandardPlanConfigEditor.vue'),
  businessWritePermissions: [],
})
