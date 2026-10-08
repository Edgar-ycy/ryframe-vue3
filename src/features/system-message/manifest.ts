import {
  defineFeatureManifest,
  isEmptyPlanConfig,
  isStandardEmptyVariant,
} from '@/features/manifest'

export const featureManifest = defineFeatureManifest({
  capabilityCode: 'system.message',
  allowedVariants: ['standard'],
  validatePlanConfig: isEmptyPlanConfig,
  validateVariantSchema: isStandardEmptyVariant,
  planConfigEditor: () => import('../StandardPlanConfigEditor.vue'),
  businessWritePermissions: [],
})
