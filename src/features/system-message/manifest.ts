import { defineFeatureManifest, isEmptyPlanConfig } from '@/features/manifest'

export const featureManifest = defineFeatureManifest({
  capabilityCode: 'system.message',
  allowedVariants: ['standard'],
  validatePlanConfig: isEmptyPlanConfig,
  planConfigEditor: () => import('../StandardPlanConfigEditor.vue'),
  businessWritePermissions: [],
})
