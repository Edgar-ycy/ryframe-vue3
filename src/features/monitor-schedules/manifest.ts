import { defineFeatureManifest } from '@/features/manifest'

export const featureManifest = defineFeatureManifest({
  capabilityCode: 'monitor.schedules',
  routeKey: 'monitor.schedules',
  permissionCode: 'monitor:schedule:list',
  path: '/monitor/schedules',
  page: () => import('@/views/monitor/schedules/index.vue'),
  allowedVariants: ['standard'],
  planConfigEditor: () => import('../StandardPlanConfigEditor.vue'),
  businessWritePermissions: [],
})
