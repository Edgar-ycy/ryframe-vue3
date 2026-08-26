import { requestOperation } from '@/api/operationRequest'
import {
  get_platform_data_targets_by_target_key_backup_points,
  get_platform_tenant_data_migrations_by_migration_id,
  get_platform_tenants_by_tenant_id_data_migrations,
  get_platform_tenants_by_tenant_id_data_placement,
  post_platform_tenant_data_migrations_by_migration_id_cancel,
  post_platform_tenant_data_migrations_by_migration_id_finalize,
  post_platform_tenants_by_tenant_id_data_migration_previews,
  post_platform_tenants_by_tenant_id_data_migrations,
} from '@/api/generated/operations'
import type { OperationData, OperationJsonBody, OperationQuery } from '@/api/contract'

export type TenantDataPlacement = OperationData<'get_platform_tenants_by_tenant_id_data_placement'>
export type TenantDataPlacementState = TenantDataPlacement['state']
export type TenantDataMigration =
  OperationData<'get_platform_tenant_data_migrations_by_migration_id'>
export type TenantDataMigrationState = TenantDataMigration['state']
export type TenantDataMigrationItem = TenantDataMigration['items'][number]
export type TenantDataMigrationPreviewInput =
  OperationJsonBody<'post_platform_tenants_by_tenant_id_data_migration_previews'>
export type TenantDataMigrationPreview =
  OperationData<'post_platform_tenants_by_tenant_id_data_migration_previews'>
export type CreateTenantDataMigrationInput =
  OperationJsonBody<'post_platform_tenants_by_tenant_id_data_migrations'>
export type TenantDataBackupPoint =
  OperationData<'get_platform_data_targets_by_target_key_backup_points'>[number]
export type TenantDataMigrationListQuery =
  OperationQuery<'get_platform_tenants_by_tenant_id_data_migrations'>
export type TenantDataBackupPointQuery =
  OperationQuery<'get_platform_data_targets_by_target_key_backup_points'>

export function getTenantDataPlacement(tenantId: string, signal?: AbortSignal) {
  return requestOperation(get_platform_tenants_by_tenant_id_data_placement, {
    path: { tenant_id: tenantId },
    signal,
  })
}

export function listTenantDataMigrations(
  tenantId: string,
  params?: TenantDataMigrationListQuery,
  signal?: AbortSignal,
) {
  return requestOperation(get_platform_tenants_by_tenant_id_data_migrations, {
    params,
    path: { tenant_id: tenantId },
    signal,
  })
}

export function previewTenantDataMigration(
  tenantId: string,
  data: TenantDataMigrationPreviewInput,
) {
  return requestOperation(post_platform_tenants_by_tenant_id_data_migration_previews, {
    data,
    path: { tenant_id: tenantId },
  })
}

export function createTenantDataMigration(
  tenantId: string,
  data: CreateTenantDataMigrationInput,
  idempotencyKey: string,
) {
  return requestOperation(post_platform_tenants_by_tenant_id_data_migrations, {
    data,
    headers: { 'Idempotency-Key': idempotencyKey },
    path: { tenant_id: tenantId },
  })
}

export function getTenantDataMigration(migrationId: string, signal?: AbortSignal) {
  return requestOperation(get_platform_tenant_data_migrations_by_migration_id, {
    path: { migration_id: migrationId },
    signal,
  })
}

export function cancelTenantDataMigration(migrationId: string, idempotencyKey: string) {
  return requestOperation(post_platform_tenant_data_migrations_by_migration_id_cancel, {
    headers: { 'Idempotency-Key': idempotencyKey },
    path: { migration_id: migrationId },
  })
}

export function finalizeTenantDataMigration(migrationId: string, idempotencyKey: string) {
  return requestOperation(post_platform_tenant_data_migrations_by_migration_id_finalize, {
    headers: { 'Idempotency-Key': idempotencyKey },
    path: { migration_id: migrationId },
  })
}

export function listTenantDataBackupPoints(
  targetKey: string,
  params?: TenantDataBackupPointQuery,
  signal?: AbortSignal,
) {
  return requestOperation(get_platform_data_targets_by_target_key_backup_points, {
    params,
    path: { target_key: targetKey },
    signal,
  })
}
