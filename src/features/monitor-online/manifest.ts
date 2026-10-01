import { defineFeatureManifest } from '@/features/manifest'

export const featureManifest = defineFeatureManifest({
  capabilityCode: 'monitor.online',
  routeKey: 'monitor.online',
  permissionCode: 'monitor:online:list',
  path: '/monitor/online',
  page: () => import('@/views/monitor/online/index.vue'),
  allowedVariants: ['standard'],
  planConfigEditor: () => import('../StandardPlanConfigEditor.vue'),
  businessWritePermissions: [],
})
