import { defineFeatureManifest } from '@/features/manifest'

export const featureManifest = defineFeatureManifest({
  capabilityCode: 'system.dict',
  routeKey: 'system.dict',
  permissionCode: 'system:dict:list',
  path: '/system/dict',
  page: () => import('@/views/system/dict/index.vue'),
  allowedVariants: ['standard'],
  planConfigEditor: () => import('../StandardPlanConfigEditor.vue'),
  businessWritePermissions: [],
})
