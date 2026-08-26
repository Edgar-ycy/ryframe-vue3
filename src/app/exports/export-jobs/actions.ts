import { getCurrentScope, onScopeDispose, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  cancelExportJob,
  deleteExportJobs,
  downloadExportJob,
  getExportJob,
  type ExportDeletionAccepted,
  type ExportJob,
} from '@/api/modules/exportJob'
import { translate } from '@/i18n'
import { downloadBlobDirect } from '@/shared/browser/download'
import { HttpError, requireOperationData } from '@/shared/http/client'
import { createIdempotencyKey, shouldReuseIdempotencyKey } from '@/shared/http/idempotency'
import { queryClient } from '@/shared/query/client'
import { useUserStore } from '@/stores/user'
import { publishExportJobEvent } from '../exportJobChannel'
import {
  exportJobListQueryKey,
  mergeExportJob,
  removeExportJob,
  type ExportJobIdentity,
} from '../exportJobCache'
import { currentExportJobIdentity, sameExportJobIdentity } from './identity'
import {
  deletionRequestKey,
  jobActionIsReserved,
  normalizeDeletionIds,
  releaseJobActions,
  reserveJobActions,
} from './actionSupport'
import { applyAcceptedDeletion, refreshAfterDeletion } from './deletionReconciliation'

export function useExportJobActions() {
  const user = useUserStore()
  const cancellingJobId = ref<string>()
  const downloadingJobId = ref<string>()
  const deletingJobIds = ref<readonly string[]>([])
  let cancelController: AbortController | undefined
  let downloadController: AbortController | undefined
  let deleteController: AbortController | undefined
  let cancelIdentity: ExportJobIdentity | undefined
  let downloadIdentity: ExportJobIdentity | undefined
  let deleteIdentity: ExportJobIdentity | undefined
  const deletionRetryKeys = new Map<string, string>()

  function identityStillCurrent(identity: ExportJobIdentity): boolean {
    const latest = currentExportJobIdentity()
    return latest !== undefined && sameExportJobIdentity(identity, latest)
  }

  function actionConflict(): HttpError {
    return new HttpError(translate('shell.http.requestFailed'), { status: 409, kind: 'http' })
  }

  function isJobActionBusy(jobId: string): boolean {
    const identity = currentExportJobIdentity()
    return (
      cancellingJobId.value === jobId ||
      downloadingJobId.value === jobId ||
      deletingJobIds.value.includes(jobId) ||
      (identity !== undefined && jobActionIsReserved(identity, jobId))
    )
  }

  async function reconcileAfterActionError(
    identity: ExportJobIdentity,
    jobId: string,
    error: unknown,
  ): Promise<void> {
    if (!identityStillCurrent(identity)) return
    if (!(error instanceof HttpError)) return
    if (error.kind === 'cancelled') return
    if (error.status === 403 || error.status === 404) {
      removeExportJob(queryClient, identity, jobId)
      return
    }
    if (error.status !== 409) return
    try {
      const latest = requireOperationData(await getExportJob(jobId))
      mergeExportJob(queryClient, identity, latest)
    } catch {
      await queryClient.invalidateQueries({
        queryKey: exportJobListQueryKey(identity.tenantId, identity.userId),
        exact: true,
      })
    }
  }

  async function cancelJob(jobId: string): Promise<ExportJob> {
    if (
      cancellingJobId.value ||
      downloadingJobId.value === jobId ||
      deletingJobIds.value.includes(jobId)
    ) {
      throw actionConflict()
    }
    const identity = currentExportJobIdentity()
    if (!identity) throw new HttpError(translate('shell.session.expired'), { status: 401 })
    if (!reserveJobActions(identity, [jobId])) throw actionConflict()
    const controller = new AbortController()
    cancellingJobId.value = jobId
    cancelController = controller
    cancelIdentity = identity
    try {
      const job = requireOperationData(await cancelExportJob(jobId, controller.signal))
      if (!identityStillCurrent(identity)) {
        throw new HttpError(translate('shell.http.requestFailed'), { kind: 'cancelled' })
      }
      mergeExportJob(queryClient, identity, job)
      publishExportJobEvent({ type: 'cancelled', ...identity, jobId })
      return job
    } catch (error) {
      await reconcileAfterActionError(identity, jobId, error)
      throw error
    } finally {
      if (cancelController === controller) {
        cancelController = undefined
        cancelIdentity = undefined
        cancellingJobId.value = undefined
      }
      releaseJobActions(identity, [jobId])
    }
  }

  async function downloadJob(job: ExportJob): Promise<void> {
    if (downloadingJobId.value) return
    if (cancellingJobId.value === job.id || deletingJobIds.value.includes(job.id)) {
      throw actionConflict()
    }
    const identity = currentExportJobIdentity()
    if (!identity) throw new HttpError(translate('shell.session.expired'), { status: 401 })
    if (!reserveJobActions(identity, [job.id])) throw actionConflict()
    const controller = new AbortController()
    downloadingJobId.value = job.id
    downloadController = controller
    downloadIdentity = identity
    try {
      const blob = await downloadExportJob(job.id, controller.signal)
      if (!identityStillCurrent(identity)) {
        throw new HttpError(translate('shell.http.requestFailed'), { kind: 'cancelled' })
      }
      downloadBlobDirect(blob, job.result_file_name || translate('shell.download.defaultFilename'))
      ElMessage.success(translate('shell.download.success'))
    } catch (error) {
      await reconcileAfterActionError(identity, job.id, error)
      throw error
    } finally {
      if (downloadController === controller) {
        downloadController = undefined
        downloadIdentity = undefined
        downloadingJobId.value = undefined
      }
      releaseJobActions(identity, [job.id])
    }
  }

  async function deleteJobs(jobIds: readonly string[]): Promise<ExportDeletionAccepted> {
    const ids = normalizeDeletionIds(jobIds, translate('shell.http.requestFailed'))
    if (
      deletingJobIds.value.length > 0 ||
      ids.some((jobId) => cancellingJobId.value === jobId || downloadingJobId.value === jobId)
    )
      throw actionConflict()

    const identity = currentExportJobIdentity()
    if (!identity) throw new HttpError(translate('shell.session.expired'), { status: 401 })
    const requestKey = deletionRequestKey(identity, ids)
    const idempotencyKey =
      deletionRetryKeys.get(requestKey) ?? createIdempotencyKey('export-job-delete')
    if (!reserveJobActions(identity, ids)) throw actionConflict()
    deletionRetryKeys.set(requestKey, idempotencyKey)
    const controller = new AbortController()
    deletingJobIds.value = ids
    deleteController = controller
    deleteIdentity = identity
    try {
      const accepted = requireOperationData(
        await deleteExportJobs(ids, idempotencyKey, controller.signal),
      )
      if (!identityStillCurrent(identity)) {
        throw new HttpError(translate('shell.http.requestFailed'), { kind: 'cancelled' })
      }
      deletionRetryKeys.delete(requestKey)
      await applyAcceptedDeletion(identity, accepted, controller.signal)
      return accepted
    } catch (error) {
      if (error instanceof HttpError && error.status === 404 && identityStillCurrent(identity)) {
        deletionRetryKeys.delete(requestKey)
        const accepted: ExportDeletionAccepted = {
          accepted_ids: ids,
          accepted_count: ids.length,
          removed_unread_count: 0,
        }
        await applyAcceptedDeletion(identity, accepted, controller.signal)
        return accepted
      }
      if (!shouldReuseIdempotencyKey(error)) deletionRetryKeys.delete(requestKey)
      if (error instanceof HttpError && error.status === 409 && identityStillCurrent(identity)) {
        await refreshAfterDeletion(identity, controller.signal)
      }
      throw error
    } finally {
      if (deleteController === controller) {
        deleteController = undefined
        deleteIdentity = undefined
        deletingJobIds.value = []
      }
      releaseJobActions(identity, ids)
    }
  }

  const unsubscribeUser = user.$subscribe(
    (_mutation, state) => {
      const stateIdentity =
        state.sessionStatus === 'authenticated' && state.tenantId && state.userId
          ? { tenantId: state.tenantId, userId: String(state.userId) }
          : undefined
      if (
        cancelIdentity &&
        (!stateIdentity || !sameExportJobIdentity(cancelIdentity, stateIdentity))
      ) {
        cancelController?.abort()
      }
      if (
        downloadIdentity &&
        (!stateIdentity || !sameExportJobIdentity(downloadIdentity, stateIdentity))
      ) {
        downloadController?.abort()
      }
      if (
        deleteIdentity &&
        (!stateIdentity || !sameExportJobIdentity(deleteIdentity, stateIdentity))
      ) {
        deleteController?.abort()
        deletionRetryKeys.clear()
      }
    },
    { flush: 'sync' },
  )

  if (getCurrentScope()) {
    onScopeDispose(() => {
      cancelController?.abort()
      downloadController?.abort()
      deleteController?.abort()
      deletionRetryKeys.clear()
      unsubscribeUser()
    })
  }

  return {
    cancelJob,
    cancellingJobId,
    deleteJobs,
    deletingJobIds,
    downloadJob,
    downloadingJobId,
    isJobActionBusy,
  }
}
/**
 * 全局协调器只读取活跃任务详情，四个并发槽位限制单轮压力；列表本身不轮询。
 * 初次读取只建立状态基线，只有本会话观察到的活跃到终态转换才会回调。
 */
