import type { ApiSchema } from '@/api/contract'

export type RuntimeBackupCollectorStatus = ApiSchema<'RuntimeBackupCollectionStatus'>
export type RuntimeBackupTagType = 'success' | 'warning' | 'danger' | 'info'

export type RuntimeBackupHealthViewModel = ApiSchema<'RuntimeBackupHealth'>
export type RuntimeBackupViewModel = ApiSchema<'RuntimeBackupStatus'>

export function backupProblemCount(health?: RuntimeBackupHealthViewModel | null): number {
  if (!health) return 0
  return health.missing_resources + health.expired_resources + health.invalid_resources
}

export function backupStatusTagType(status?: RuntimeBackupCollectorStatus): RuntimeBackupTagType {
  if (status === 'available') return 'success'
  if (status === 'stale') return 'warning'
  if (status === 'unavailable') return 'danger'
  return 'info'
}

export function backupStatusTranslationKey(status?: RuntimeBackupCollectorStatus): string {
  if (status === 'available') return 'monitor.runtime.backupAvailable'
  if (status === 'stale') return 'monitor.runtime.backupStale'
  if (status === 'unavailable') return 'monitor.runtime.backupUnavailable'
  return 'monitor.runtime.backupUnknown'
}

export function backupRestoreTranslationKey(health?: RuntimeBackupHealthViewModel | null): string {
  if (!validBackupTime(health?.last_restore_completed)) return 'monitor.runtime.backupNoRestore'
  return health.last_restore_succeeded
    ? 'monitor.runtime.backupRestoreSucceeded'
    : 'monitor.runtime.backupRestoreFailed'
}

export function validBackupTime(value?: string | null): value is string {
  return Boolean(
    value && /(?:Z|[+-][0-9]{2}:[0-9]{2})$/u.test(value) && Number.isFinite(Date.parse(value)),
  )
}

export function formatBackupTime(value: string | null | undefined, locale: string): string {
  if (!validBackupTime(value)) return '—'
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(value))
}

export function formatBackupSeconds(
  value: number | null | undefined,
  translate: (key: string, params: { value: number }) => string,
): string {
  return value == null ? '—' : translate('monitor.runtime.seconds', { value })
}
