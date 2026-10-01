import { defineFeatureManifest } from '@/features/manifest'

export const featureManifest = defineFeatureManifest({
  capabilityCode: 'monitor.jobs',
  routeKey: 'monitor.jobs',
  permissionCode: 'monitor:job:list',
  path: '/monitor/jobs',
  page: () => import('@/views/monitor/jobs/index.vue'),
  allowedVariants: ['standard'],
  planConfigEditor: () => import('../StandardPlanConfigEditor.vue'),
  businessWritePermissions: [],
})
