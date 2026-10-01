import { defineFeatureManifest } from '@/features/manifest'

export const featureManifest = defineFeatureManifest({
  capabilityCode: 'system.post',
  routeKey: 'system.post',
  permissionCode: 'system:post:list',
  path: '/system/post',
  page: () => import('@/views/system/post/index.vue'),
  allowedVariants: ['standard'],
  planConfigEditor: () => import('./PlanConfigEditor.vue'),
  businessWritePermissions: [
    'system:post:add',
    'system:post:edit',
    'system:post:remove',
    'system:post:export',
  ],
})
