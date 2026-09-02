import {
  getUnreadExportNotificationCount,
  listExportJobs,
  type ExportDeletionAccepted,
} from '@/api/modules/exportJob'
import { requireOperationData } from '@/shared/http/client'
import { isServerStateScopeCurrent, queryClient } from '@/shared/query/client'
import type { ServerStateScope } from '@/shared/query/scope'
import { publishExportJobEvent } from '../exportJobChannel'
import { exportJobListQueryKey, exportJobUnreadQueryKey, removeExportJobs } from '../exportJobCache'

export async function refreshAfterDeletion(
  scope: ServerStateScope,
  signal: AbortSignal,
): Promise<void> {
  const [listResult, unreadResult] = await Promise.allSettled([
    listExportJobs(signal).then((response) => requireOperationData(response)),
    getUnreadExportNotificationCount(signal).then((response) => requireOperationData(response)),
  ])
  if (!isServerStateScopeCurrent(scope)) return
  const listKey = exportJobListQueryKey(scope)
  const unreadKey = exportJobUnreadQueryKey(scope)
  if (listResult.status === 'fulfilled') queryClient.setQueryData(listKey, listResult.value)
  else void queryClient.invalidateQueries({ queryKey: listKey, exact: true, refetchType: 'none' })
  if (unreadResult.status === 'fulfilled') queryClient.setQueryData(unreadKey, unreadResult.value)
  else void queryClient.invalidateQueries({ queryKey: unreadKey, exact: true, refetchType: 'none' })
}

export async function applyAcceptedDeletion(
  scope: ServerStateScope,
  accepted: ExportDeletionAccepted,
  signal: AbortSignal,
): Promise<void> {
  if (!isServerStateScopeCurrent(scope)) return
  removeExportJobs(queryClient, scope, accepted.accepted_ids)
  if (accepted.removed_unread_count > 0) {
    queryClient.setQueryData<number>(exportJobUnreadQueryKey(scope), (current) =>
      current === undefined ? undefined : Math.max(0, current - accepted.removed_unread_count),
    )
  }
  if (!isServerStateScopeCurrent(scope)) return
  publishExportJobEvent({ type: 'deleted', ...scope, jobIds: accepted.accepted_ids })
  await refreshAfterDeletion(scope, signal)
}
