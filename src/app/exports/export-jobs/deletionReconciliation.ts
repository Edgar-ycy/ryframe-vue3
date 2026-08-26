import {
  getUnreadExportNotificationCount,
  listExportJobs,
  type ExportDeletionAccepted,
} from '@/api/modules/exportJob'
import { requireOperationData } from '@/shared/http/client'
import { queryClient } from '@/shared/query/client'
import { publishExportJobEvent } from '../exportJobChannel'
import {
  exportJobListQueryKey,
  exportJobUnreadQueryKey,
  removeExportJobs,
  type ExportJobIdentity,
} from '../exportJobCache'
import { currentExportJobIdentity, sameExportJobIdentity } from './identity'

function identityStillCurrent(identity: ExportJobIdentity): boolean {
  const latest = currentExportJobIdentity()
  return latest !== undefined && sameExportJobIdentity(identity, latest)
}

export async function refreshAfterDeletion(
  identity: ExportJobIdentity,
  signal: AbortSignal,
): Promise<void> {
  const [listResult, unreadResult] = await Promise.allSettled([
    listExportJobs(signal).then((response) => requireOperationData(response)),
    getUnreadExportNotificationCount(signal).then((response) => requireOperationData(response)),
  ])
  if (!identityStillCurrent(identity)) return
  const listKey = exportJobListQueryKey(identity.tenantId, identity.userId)
  const unreadKey = exportJobUnreadQueryKey(identity.tenantId, identity.userId)
  if (listResult.status === 'fulfilled') queryClient.setQueryData(listKey, listResult.value)
  else void queryClient.invalidateQueries({ queryKey: listKey, exact: true, refetchType: 'none' })
  if (unreadResult.status === 'fulfilled') queryClient.setQueryData(unreadKey, unreadResult.value)
  else void queryClient.invalidateQueries({ queryKey: unreadKey, exact: true, refetchType: 'none' })
}

export async function applyAcceptedDeletion(
  identity: ExportJobIdentity,
  accepted: ExportDeletionAccepted,
  signal: AbortSignal,
): Promise<void> {
  removeExportJobs(queryClient, identity, accepted.accepted_ids)
  if (accepted.removed_unread_count > 0) {
    queryClient.setQueryData<number>(
      exportJobUnreadQueryKey(identity.tenantId, identity.userId),
      (current) =>
        current === undefined ? undefined : Math.max(0, current - accepted.removed_unread_count),
    )
  }
  publishExportJobEvent({ type: 'deleted', ...identity, jobIds: accepted.accepted_ids })
  await refreshAfterDeletion(identity, signal)
}
