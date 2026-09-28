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

export function blocksNewMigration(state: TenantDataMigrationState): boolean {
  return state !== 'finalized' && state !== 'failed' && state !== 'cancelled'
}

export function shouldPollMigration(
  migration: Pick<TenantDataMigration, 'state' | 'cancel_requested' | 'finalize_requested'>,
): boolean {
  return (
    blocksNewMigration(migration.state) &&
    (ACTIVE_POLLING_STATES.has(migration.state) ||
      migration.cancel_requested ||
      migration.finalize_requested)
  )
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
