import { getCurrentScope, onScopeDispose, watch, type MaybeRefOrGetter } from 'vue'
import {
  getUnreadExportNotificationCount,
  markExportNotificationsRead,
  type ExportJob,
} from '@/api/modules/exportJob'
import { requireOperationData } from '@/shared/http/client'
import { isServerStateScopeCurrent, queryClient, useServerStateScope } from '@/shared/query/client'
import type { ServerStateScope } from '@/shared/query/scope'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'
import { publishExportJobEvent } from '../exportJobChannel'
import {
  exportJobUnreadQueryKey,
  EXPORT_JOB_NOTIFICATIONS_RESOURCE,
  isUnreadExportNotification,
  markExportNotificationsReadInCache,
} from '../exportJobCache'
import { currentExportJobScope, shouldEnableExportJobs } from './identity'

export function useExportNotificationState(enabled: MaybeRefOrGetter<boolean> = true) {
  const unreadQuery = useServerStateQuery<number>(
    () => shouldEnableExportJobs(enabled),
    EXPORT_JOB_NOTIFICATIONS_RESOURCE,
    () => ({ scope: 'unread-count' }),
    async (signal) => requireOperationData(await getUnreadExportNotificationCount(signal)),
    {
      staleTime: Number.POSITIVE_INFINITY,
      gcTime: 10 * 60_000,
      refetchInterval: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      meta: { errorMode: 'silent' },
    },
  )
  let readController: AbortController | undefined
  let readScope: ServerStateScope | undefined

  async function refreshUnread(): Promise<void> {
    if (!shouldEnableExportJobs(enabled)) return
    await unreadQuery.refetch({ throwOnError: true })
  }

  async function markVisibleNotificationsRead(jobs: readonly ExportJob[]): Promise<void> {
    const scope = currentExportJobScope()
    if (!scope) return
    const ids = jobs
      .filter(isUnreadExportNotification)
      .map((job) => job.id)
      .slice(0, 100)
    if (ids.length === 0) return
    readController?.abort()
    const controller = new AbortController()
    readController = controller
    readScope = scope
    try {
      const affected = requireOperationData(
        await markExportNotificationsRead(ids, controller.signal),
      )
      if (!isServerStateScopeCurrent(scope)) return
      const readAt = new Date().toISOString()
      markExportNotificationsReadInCache(queryClient, scope, ids, readAt)
      queryClient.setQueryData(exportJobUnreadQueryKey(scope), (current: number | undefined) =>
        Math.max(0, (current ?? affected) - affected),
      )
      publishExportJobEvent({ type: 'notifications-read', ...scope, jobIds: ids, readAt })
      await refreshUnread().catch(() => undefined)
    } finally {
      if (readController === controller) {
        readController = undefined
        readScope = undefined
      }
    }
  }

  const stopScopeWatch = watch(
    useServerStateScope(),
    () => {
      if (readScope && !isServerStateScopeCurrent(readScope)) {
        readController?.abort()
        readController = undefined
        readScope = undefined
      }
    },
    { flush: 'sync' },
  )

  if (getCurrentScope()) {
    onScopeDispose(() => {
      readController?.abort()
      stopScopeWatch()
    })
  }

  return {
    unreadCount: unreadQuery.data,
    unreadLoading: unreadQuery.isFetching,
    refreshUnread,
    markVisibleNotificationsRead,
  }
}

/** 取消和下载是显式用户操作，不会建立任务轮询。 */
