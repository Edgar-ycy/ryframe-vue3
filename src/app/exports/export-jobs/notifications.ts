import { computed, getCurrentScope, onScopeDispose, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import {
  getUnreadExportNotificationCount,
  markExportNotificationsRead,
  type ExportJob,
} from '@/api/modules/exportJob'
import { HttpError, requireOperationData } from '@/shared/http/client'
import { queryClient } from '@/shared/query/client'
import { useUserStore } from '@/stores/user'
import { publishExportJobEvent } from '../exportJobChannel'
import {
  exportJobUnreadQueryKey,
  isUnreadExportNotification,
  markExportNotificationsReadInCache,
  type ExportJobIdentity,
} from '../exportJobCache'
import {
  currentExportJobIdentity,
  sameExportJobIdentity,
  shouldEnableExportJobs,
} from './identity'

export function useExportNotificationState(
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const user = useUserStore()
  const unreadQuery = useQuery<number, HttpError>({
    queryKey: computed(() => exportJobUnreadQueryKey(
      user.tenantId || 'anonymous',
      String(user.userId || 'anonymous'),
    )),
    enabled: computed(() => shouldEnableExportJobs(enabled)),
    queryFn: async ({ signal }) => requireOperationData(
      await getUnreadExportNotificationCount(signal),
    ),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 10 * 60_000,
    refetchInterval: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    meta: { errorMode: 'silent' },
  })
  let readController: AbortController | undefined
  let readIdentity: ExportJobIdentity | undefined

  function identityStillCurrent(identity: ExportJobIdentity): boolean {
    const latest = currentExportJobIdentity()
    return latest !== undefined && sameExportJobIdentity(identity, latest)
  }

  async function refreshUnread(): Promise<void> {
    if (!shouldEnableExportJobs(enabled)) return
    await unreadQuery.refetch({ throwOnError: true })
  }

  async function markVisibleNotificationsRead(jobs: readonly ExportJob[]): Promise<void> {
    const identity = currentExportJobIdentity()
    if (!identity) return
    const ids = jobs.filter(isUnreadExportNotification).map(job => job.id).slice(0, 100)
    if (ids.length === 0) return
    readController?.abort()
    const controller = new AbortController()
    readController = controller
    readIdentity = identity
    try {
      const affected = requireOperationData(
        await markExportNotificationsRead(ids, controller.signal),
      )
      if (!identityStillCurrent(identity)) return
      const readAt = new Date().toISOString()
      markExportNotificationsReadInCache(queryClient, identity, ids, readAt)
      queryClient.setQueryData(
        exportJobUnreadQueryKey(identity.tenantId, identity.userId),
        (current: number | undefined) => Math.max(0, (current ?? affected) - affected),
      )
      publishExportJobEvent({ type: 'notifications-read', ...identity, jobIds: ids, readAt })
      await refreshUnread().catch(() => undefined)
    }
    finally {
      if (readController === controller) {
        readController = undefined
        readIdentity = undefined
      }
    }
  }

  const unsubscribeUser = user.$subscribe(() => {
    if (readIdentity && !identityStillCurrent(readIdentity)) readController?.abort()
  }, { flush: 'sync' })

  if (getCurrentScope()) {
    onScopeDispose(() => {
      readController?.abort()
      unsubscribeUser()
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
