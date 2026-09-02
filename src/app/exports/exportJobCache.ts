import type { QueryClient, QueryKey } from '@tanstack/vue-query'
import type { ExportJob } from '@/api/modules/exportJob'
import { isServerStateScopeCurrent, serverStateQueryKey } from '@/shared/query/client'
import type { ServerStateScope } from '@/shared/query/scope'

export const EXPORT_JOBS_RESOURCE = 'export-jobs'
export const EXPORT_JOB_NOTIFICATIONS_RESOURCE = 'export-job-notifications'

export function exportJobListQueryKey(scope: ServerStateScope): QueryKey {
  return serverStateQueryKey(scope, EXPORT_JOBS_RESOURCE, {
    scope: 'list',
  })
}

export function exportJobDetailQueryKey(scope: ServerStateScope, jobId: string): QueryKey {
  return serverStateQueryKey(scope, EXPORT_JOBS_RESOURCE, {
    scope: 'detail',
    jobId,
  })
}

export function exportJobUnreadQueryKey(scope: ServerStateScope): QueryKey {
  return serverStateQueryKey(scope, EXPORT_JOB_NOTIFICATIONS_RESOURCE, {
    scope: 'unread-count',
  })
}

export function exportJobListFromCache(client: QueryClient, scope: ServerStateScope): ExportJob[] {
  return client.getQueryData<ExportJob[]>(exportJobListQueryKey(scope)) ?? []
}

/** 将最新任务写入列表顶部，同时保持服务端“最近一百条”的上限。 */
export function prependExportJob(
  client: QueryClient,
  scope: ServerStateScope,
  job: ExportJob,
): void {
  if (!isServerStateScopeCurrent(scope)) return
  const key = exportJobListQueryKey(scope)
  client.setQueryData<ExportJob[]>(key, (current) =>
    [job, ...(current ?? []).filter((item) => item.id !== job.id)].slice(0, 100),
  )
  client.setQueryData(exportJobDetailQueryKey(scope, job.id), job)
}

/** 合并任务详情，避免详情轮询触发完整列表请求。 */
export function mergeExportJob(client: QueryClient, scope: ServerStateScope, job: ExportJob): void {
  if (!isServerStateScopeCurrent(scope)) return
  const key = exportJobListQueryKey(scope)
  client.setQueryData<ExportJob[]>(key, (current) => {
    if (!current) return [job]
    const index = current.findIndex((item) => item.id === job.id)
    if (index < 0) return [job, ...current].slice(0, 100)
    const next = current.slice()
    next[index] = job
    return next
  })
  client.setQueryData(exportJobDetailQueryKey(scope, job.id), job)
}

export function removeExportJob(client: QueryClient, scope: ServerStateScope, jobId: string): void {
  removeExportJobs(client, scope, [jobId])
}

/** 一次清理已删除任务的列表和详情缓存，避免批量删除反复改写同一列表。 */
export function removeExportJobs(
  client: QueryClient,
  scope: ServerStateScope,
  jobIds: readonly string[],
): void {
  if (!isServerStateScopeCurrent(scope)) return
  const ids = new Set(jobIds)
  if (ids.size === 0) return
  client.setQueryData<ExportJob[]>(exportJobListQueryKey(scope), (current) =>
    current?.filter((item) => !ids.has(item.id)),
  )
  for (const jobId of ids) {
    client.removeQueries({
      queryKey: exportJobDetailQueryKey(scope, jobId),
      exact: true,
    })
  }
}

export function isActiveExportJob(job: ExportJob): boolean {
  return job.status === 'queued' || job.status === 'running'
}

export function isTerminalExportJob(job: ExportJob): boolean {
  return (
    job.status === 'succeeded' ||
    job.status === 'failed' ||
    job.status === 'cancelled' ||
    job.status === 'expired'
  )
}

export function isUnreadExportNotification(job: ExportJob): boolean {
  return (job.status === 'succeeded' || job.status === 'failed') && !job.notification_read_at
}

/** 同步已读结果到列表和详情缓存；服务端时间会在下一次刷新时覆盖本地展示值。 */
export function markExportNotificationsReadInCache(
  client: QueryClient,
  scope: ServerStateScope,
  jobIds: readonly string[],
  readAt = new Date().toISOString(),
): void {
  if (!isServerStateScopeCurrent(scope)) return
  const ids = new Set(jobIds)
  if (ids.size === 0) return
  const listKey = exportJobListQueryKey(scope)
  client.setQueryData<ExportJob[]>(listKey, (current) =>
    current?.map((job) =>
      ids.has(job.id) && isUnreadExportNotification(job)
        ? { ...job, notification_read_at: readAt }
        : job,
    ),
  )
  for (const id of ids) {
    client.setQueryData<ExportJob>(exportJobDetailQueryKey(scope, id), (current) =>
      current && isUnreadExportNotification(current)
        ? { ...current, notification_read_at: readAt }
        : current,
    )
  }
}
