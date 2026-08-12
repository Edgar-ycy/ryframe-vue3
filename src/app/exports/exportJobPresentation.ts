import type { ExportJob } from '@/api/modules/exportJob'
import { translate } from '@/i18n'

const RESOURCE_KEYS: Record<string, string> = {
  users: 'exportCenter.resourceUsers',
  roles: 'exportCenter.resourceRoles',
  posts: 'exportCenter.resourcePosts',
  configs: 'exportCenter.resourceConfigs',
  'dict-types': 'exportCenter.resourceDictTypes',
  operlogs: 'exportCenter.resourceOperlogs',
  loginlogs: 'exportCenter.resourceLoginlogs',
}

const STATUS_KEYS: Record<string, string> = {
  queued: 'exportCenter.queued',
  running: 'exportCenter.running',
  succeeded: 'exportCenter.succeeded',
  failed: 'exportCenter.failed',
  cancelled: 'exportCenter.cancelled',
  expired: 'exportCenter.expired',
}

export type ExportJobTagType = 'info' | 'primary' | 'success' | 'warning' | 'danger'

export function exportJobResourceKey(resource: string): string {
  return RESOURCE_KEYS[resource] ?? 'exportCenter.resourceUnknown'
}

export function exportJobStatusKey(status: string): string {
  return STATUS_KEYS[status] ?? 'exportCenter.unknown'
}

export function exportJobStatusTag(status: string): ExportJobTagType {
  if (status === 'queued') return 'info'
  if (status === 'running') return 'primary'
  if (status === 'succeeded') return 'success'
  if (status === 'cancelled' || status === 'expired') return 'warning'
  return 'danger'
}

export function formatExportFileSize(value: number | null | undefined): string {
  if (value === null || value === undefined || value < 0) return '—'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`
  return `${(value / (1024 * 1024)).toFixed(1)} MiB`
}

export function isExportDownloadExpired(job: ExportJob): boolean {
  if (job.status === 'expired') return true
  return Boolean(job.expires_at && Date.parse(job.expires_at) <= Date.now())
}

/** 未生成文件名时只显示资源名称，不向界面暴露内部任务 ID。 */
export function exportJobDisplayName(job: ExportJob): string {
  return job.result_file_name || translate(exportJobResourceKey(job.resource))
}
