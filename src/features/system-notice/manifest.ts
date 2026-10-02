import { defineFeatureManifest } from '@/features/manifest'

export const featureManifest = defineFeatureManifest({
  capabilityCode: 'system.notice',
  routeKey: 'system.notice',
  permissionCode: 'system:notice:list',
  path: '/system/notice',
  page: () => import('@/views/system/notice/index.vue'),
  allowedVariants: ['standard'],
  planConfigEditor: () => import('../StandardPlanConfigEditor.vue'),
  businessWritePermissions: [],
})
