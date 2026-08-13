import type { QueryClient, QueryKey } from '@tanstack/vue-query'
import type { ExportJob } from '@/api/modules/exportJob'

export interface ExportJobIdentity {
  tenantId: string
  userId: string
}

export function exportJobListQueryKey(tenantId: string, userId: string): QueryKey {
  return ['tenant', tenantId, 'user', userId, 'export-jobs']
}

export function exportJobDetailQueryKey(
  tenantId: string,
  userId: string,
  jobId: string,
): QueryKey {
  return [...exportJobListQueryKey(tenantId, userId), jobId]
}

export function exportJobUnreadQueryKey(tenantId: string, userId: string): QueryKey {
  return [...exportJobListQueryKey(tenantId, userId), 'notifications', 'unread-count']
}

/** 将最新任务写入列表顶部，同时保持服务端“最近一百条”的上限。 */
export function prependExportJob(
  client: QueryClient,
  identity: ExportJobIdentity,
  job: ExportJob,
): void {
  const key = exportJobListQueryKey(identity.tenantId, identity.userId)
  client.setQueryData<ExportJob[]>(key, current => [
    job,
    ...(current ?? []).filter(item => item.id !== job.id),
  ].slice(0, 100))
  client.setQueryData(exportJobDetailQueryKey(identity.tenantId, identity.userId, job.id), job)
}

/** 合并任务详情，避免详情轮询触发完整列表请求。 */
export function mergeExportJob(
  client: QueryClient,
  identity: ExportJobIdentity,
  job: ExportJob,
): void {
  const key = exportJobListQueryKey(identity.tenantId, identity.userId)
  client.setQueryData<ExportJob[]>(key, current => {
    if (!current) return [job]
    const index = current.findIndex(item => item.id === job.id)
    if (index < 0) return [job, ...current].slice(0, 100)
    const next = current.slice()
    next[index] = job
    return next
  })
  client.setQueryData(exportJobDetailQueryKey(identity.tenantId, identity.userId, job.id), job)
}

export function removeExportJob(
  client: QueryClient,
  identity: ExportJobIdentity,
  jobId: string,
): void {
  client.setQueryData<ExportJob[]>(
    exportJobListQueryKey(identity.tenantId, identity.userId),
    current => current?.filter(item => item.id !== jobId),
  )
  client.removeQueries({
    queryKey: exportJobDetailQueryKey(identity.tenantId, identity.userId, jobId),
    exact: true,
  })
}

export function isActiveExportJob(job: ExportJob): boolean {
  return job.status === 'queued' || job.status === 'running'
}

export function isUnreadExportNotification(job: ExportJob): boolean {
  return (job.status === 'succeeded' || job.status === 'failed')
    && !job.notification_read_at
}

/** 同步已读结果到列表和详情缓存；服务端时间会在下一次刷新时覆盖本地展示值。 */
export function markExportNotificationsReadInCache(
  client: QueryClient,
  identity: ExportJobIdentity,
  jobIds: readonly string[],
  readAt = new Date().toISOString(),
): void {
  const ids = new Set(jobIds)
  if (ids.size === 0) return
  const listKey = exportJobListQueryKey(identity.tenantId, identity.userId)
  client.setQueryData<ExportJob[]>(listKey, current => current?.map(job => (
    ids.has(job.id) && isUnreadExportNotification(job)
      ? { ...job, notification_read_at: readAt }
      : job
  )))
  for (const id of ids) {
    client.setQueryData<ExportJob>(
      exportJobDetailQueryKey(identity.tenantId, identity.userId, id),
      current => current && isUnreadExportNotification(current)
        ? { ...current, notification_read_at: readAt }
        : current,
    )
  }
}
