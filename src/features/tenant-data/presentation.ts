import type { TagProps } from 'element-plus'
import type { TenantDataMigration, TenantDataMigrationState } from '@/api/modules/tenantData'

const CANCELLABLE_STATES = new Set<TenantDataMigrationState>([
  'prechecking',
  'queued',
  'quiescing',
  'frozen',
  'copying',
  'verifying',
])

const ACTIVE_POLLING_STATES = new Set<TenantDataMigrationState>([
  'prechecking',
  'queued',
  'quiescing',
  'frozen',
  'copying',
  'verifying',
  'cutting_over',
  'activating',
  'succeeded',
])

export function isMigrationInProgress(state: TenantDataMigrationState): boolean {
  return ACTIVE_POLLING_STATES.has(state)
}

export function canCancelMigration(migration: TenantDataMigration): boolean {
  return migration.can_cancel && CANCELLABLE_STATES.has(migration.state)
}

export function canFinalizeMigration(migration: TenantDataMigration): boolean {
  return migration.can_finalize && migration.state === 'retention_pending'
}

export function stateTagType(state: string): TagProps['type'] {
  if (state === 'active' || state === 'verified' || state === 'valid' || state === 'finalized')
    return 'success'
  if (state === 'failed' || state === 'invalid') return 'danger'
  if (state === 'cancelled') return 'info'
  if (state === 'maintenance' || state === 'retention_pending') return 'warning'
  return 'primary'
}

export function healthTagType(health: string): TagProps['type'] {
  if (health === 'healthy' || health === 'verified') return 'success'
  if (health === 'degraded') return 'warning'
  if (health === 'unavailable') return 'danger'
  return 'info'
}
