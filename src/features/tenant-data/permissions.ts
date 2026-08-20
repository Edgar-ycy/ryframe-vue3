import type { PermissionCode } from '@/api/generated/permissions'

export const TENANT_DATA_PERMISSIONS = Object.freeze({
  placementView: 'tenant:data-placement:view',
  migrationList: 'tenant:data-migration:list',
  migrationCreate: 'tenant:data-migration:create',
  migrationCancel: 'tenant:data-migration:cancel',
  migrationFinalize: 'tenant:data-migration:finalize',
  backupList: 'tenant:data-backup:list',
} satisfies Record<string, PermissionCode>)
