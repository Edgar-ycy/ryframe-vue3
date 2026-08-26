import type { DataRetentionPolicy } from '@/api/modules/monitor'

export type RetentionPolicyWindow = {
  key: string
  value: number
  unit: 'days' | 'hours'
}

const RESOURCE_KEYS: Record<string, string> = {
  background_jobs: 'monitor.retention.resourceBackgroundJobs',
  outbox_events: 'monitor.retention.resourceOutboxEvents',
  schedule_executions: 'monitor.retention.resourceScheduleExecutions',
  export_jobs: 'monitor.retention.resourceExportJobs',
  operation_logs: 'monitor.retention.resourceOperationLogs',
  login_logs: 'monitor.retention.resourceLoginLogs',
  user_imports: 'monitor.retention.resourceUserImports',
  user_import_artifacts: 'monitor.retention.resourceUserImportArtifacts',
  retention_runs: 'monitor.retention.resourceRetentionRuns',
}

export function policyWindows(policy: DataRetentionPolicy): RetentionPolicyWindow[] {
  return [
    { key: 'background_jobs', value: policy.background_job_succeeded_days, unit: 'days' },
    { key: 'outbox_events', value: policy.outbox_published_days, unit: 'days' },
    { key: 'schedule_executions', value: policy.schedule_execution_days, unit: 'days' },
    { key: 'export_jobs', value: policy.export_job_history_days, unit: 'days' },
    { key: 'operation_logs', value: policy.operation_log_days, unit: 'days' },
    { key: 'login_logs', value: policy.login_log_days, unit: 'days' },
    { key: 'user_imports', value: policy.user_import_history_days, unit: 'days' },
    { key: 'user_import_artifacts', value: policy.user_import_artifact_hours, unit: 'hours' },
    { key: 'retention_runs', value: policy.retention_run_days, unit: 'days' },
  ]
}

export function retentionResourceKey(resource: string): string | undefined {
  return RESOURCE_KEYS[resource]
}

export function countEntries(value: unknown): Array<[string, number]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  return Object.entries(value).flatMap(([key, count]) =>
    typeof count === 'number' && Number.isFinite(count) ? [[key, count] as [string, number]] : [],
  )
}

export function totalCount(value: unknown): number {
  return countEntries(value).reduce((total, entry) => total + entry[1], 0)
}

export function countSummary(
  value: unknown,
  resourceLabel: (resource: string) => string,
  formatNumber: (value: number) => string,
): string {
  const entries = countEntries(value).filter((entry) => entry[1] > 0)
  if (!entries.length) return '—'
  return entries.map((entry) => `${resourceLabel(entry[0])} ${formatNumber(entry[1])}`).join('；')
}

export function retentionTriggerKey(value: string): string {
  return value === 'scheduled'
    ? 'monitor.retention.triggerScheduled'
    : 'monitor.retention.triggerManual'
}

export function retentionStatusKey(value: string): string {
  const key =
    {
      pending: 'statusPending',
      running: 'statusRunning',
      succeeded: 'statusSucceeded',
      partial: 'statusPartial',
      failed: 'statusFailed',
    }[value] ?? 'statusFailed'
  return `monitor.retention.${key}`
}

export function retentionStatusTag(
  value: string,
): 'danger' | 'info' | 'primary' | 'success' | 'warning' {
  if (value === 'succeeded') return 'success'
  if (value === 'failed') return 'danger'
  if (value === 'partial') return 'warning'
  if (value === 'running') return 'primary'
  return 'info'
}
