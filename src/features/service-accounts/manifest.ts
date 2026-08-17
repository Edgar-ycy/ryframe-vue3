import { defineFeatureManifest } from '@/features/manifest'

export const SERVICE_ACCOUNTS_CAPABILITY = 'system.service_accounts'
export const SERVICE_ACCOUNTS_ROUTE_KEY = 'system.service-accounts'

export const serviceAccountsFeature = defineFeatureManifest({
  capabilityCode: SERVICE_ACCOUNTS_CAPABILITY,
  routeKey: SERVICE_ACCOUNTS_ROUTE_KEY,
  permissionCode: 'system:service-account:list',
  path: '/system/service-accounts',
  page: () => import('@/views/system/service-accounts/index.vue'),
  allowedVariants: ['default'],
  planConfigEditor: () => import('./planConfigEditor.vue'),
  businessWritePermissions: [],
})
