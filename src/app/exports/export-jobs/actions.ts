import { getCurrentScope, onScopeDispose, ref, watch } from 'vue'
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
import { isServerStateScopeCurrent, queryClient, useServerStateScope } from '@/shared/query/client'
import { sameServerStateScope, type ServerStateScope } from '@/shared/query/scope'
import { publishExportJobEvent } from '../exportJobChannel'
import { exportJobListQueryKey, mergeExportJob, removeExportJob } from '../exportJobCache'
import { currentExportJobScope } from './identity'
import {
  deletionRequestKey,
  jobActionIsReserved,
  normalizeDeletionIds,
  releaseJobActions,
  reserveJobActions,
} from './actionSupport'
import { applyAcceptedDeletion, refreshAfterDeletion } from './deletionReconciliation'

export function useExportJobActions() {
  const cancellingJobId = ref<string>()
  const downloadingJobId = ref<string>()
  const deletingJobIds = ref<readonly string[]>([])
  let cancelController: AbortController | undefined
  let downloadController: AbortController | undefined
  let deleteController: AbortController | undefined
  let cancelScope: ServerStateScope | undefined
  let downloadScope: ServerStateScope | undefined
  let deleteScope: ServerStateScope | undefined
  const deletionRetryKeys = new Map<string, string>()

  function actionConflict(): HttpError {
    return new HttpError(translate('shell.http.requestFailed'), { status: 409, kind: 'http' })
  }

  function requireActionScope(expectedScope: ServerStateScope): ServerStateScope {
    const scope = currentExportJobScope()
    if (!scope) throw new HttpError(translate('shell.session.expired'), { status: 401 })
    if (!sameServerStateScope(scope, expectedScope)) {
      throw new HttpError(translate('shell.http.requestFailed'), {
        status: 401,
        kind: 'cancelled',
      })
    }
    return scope
  }

  function isJobActionBusy(jobId: string): boolean {
    const scope = currentExportJobScope()
    return (
      cancellingJobId.value === jobId ||
      downloadingJobId.value === jobId ||
      deletingJobIds.value.includes(jobId) ||
      (scope !== undefined && jobActionIsReserved(scope, jobId))
    )
  }

  async function reconcileAfterActionError(
    scope: ServerStateScope,
    jobId: string,
    error: unknown,
  ): Promise<void> {
    if (!isServerStateScopeCurrent(scope)) return
    if (!(error instanceof HttpError)) return
    if (error.kind === 'cancelled') return
    if (error.status === 403 || error.status === 404) {
      removeExportJob(queryClient, scope, jobId)
      return
    }
    if (error.status !== 409) return
    try {
      const latest = requireOperationData(await getExportJob(jobId))
      if (!isServerStateScopeCurrent(scope)) return
      mergeExportJob(queryClient, scope, latest)
    } catch {
      if (!isServerStateScopeCurrent(scope)) return
      await queryClient.invalidateQueries({
        queryKey: exportJobListQueryKey(scope),
        exact: true,
      })
    }
  }

  async function cancelJob(jobId: string, expectedScope: ServerStateScope): Promise<ExportJob> {
    const scope = requireActionScope(expectedScope)
    if (
      cancellingJobId.value ||
      downloadingJobId.value === jobId ||
      deletingJobIds.value.includes(jobId)
    ) {
      throw actionConflict()
    }
    if (!reserveJobActions(scope, [jobId])) throw actionConflict()
    const controller = new AbortController()
    cancellingJobId.value = jobId
    cancelController = controller
    cancelScope = scope
    try {
      const job = requireOperationData(await cancelExportJob(jobId, controller.signal))
      if (!isServerStateScopeCurrent(scope)) {
        throw new HttpError(translate('shell.http.requestFailed'), { kind: 'cancelled' })
      }
      mergeExportJob(queryClient, scope, job)
      publishExportJobEvent({ type: 'cancelled', ...scope, jobId })
      return job
    } catch (error) {
      await reconcileAfterActionError(scope, jobId, error)
      throw error
    } finally {
      if (cancelController === controller) {
        cancelController = undefined
        cancelScope = undefined
        cancellingJobId.value = undefined
      }
      releaseJobActions(scope, [jobId])
    }
  }

  async function downloadJob(job: ExportJob, expectedScope: ServerStateScope): Promise<void> {
    const scope = requireActionScope(expectedScope)
    if (downloadingJobId.value) return
    if (cancellingJobId.value === job.id || deletingJobIds.value.includes(job.id)) {
      throw actionConflict()
    }
    if (!reserveJobActions(scope, [job.id])) throw actionConflict()
    const controller = new AbortController()
    downloadingJobId.value = job.id
    downloadController = controller
    downloadScope = scope
    try {
      const blob = await downloadExportJob(job.id, controller.signal)
      if (!isServerStateScopeCurrent(scope)) {
        throw new HttpError(translate('shell.http.requestFailed'), { kind: 'cancelled' })
      }
      downloadBlobDirect(blob, job.result_file_name || translate('shell.download.defaultFilename'))
      ElMessage.success(translate('shell.download.success'))
    } catch (error) {
      await reconcileAfterActionError(scope, job.id, error)
      throw error
    } finally {
      if (downloadController === controller) {
        downloadController = undefined
        downloadScope = undefined
        downloadingJobId.value = undefined
      }
      releaseJobActions(scope, [job.id])
    }
  }

  async function deleteJobs(
    jobIds: readonly string[],
    expectedScope: ServerStateScope,
  ): Promise<ExportDeletionAccepted> {
    const scope = requireActionScope(expectedScope)
    const ids = normalizeDeletionIds(jobIds, translate('shell.http.requestFailed'))
    if (
      deletingJobIds.value.length > 0 ||
      ids.some((jobId) => cancellingJobId.value === jobId || downloadingJobId.value === jobId)
    )
      throw actionConflict()

    const requestKey = deletionRequestKey(scope, ids)
    const idempotencyKey =
      deletionRetryKeys.get(requestKey) ?? createIdempotencyKey('export-job-delete')
    if (!reserveJobActions(scope, ids)) throw actionConflict()
    deletionRetryKeys.set(requestKey, idempotencyKey)
    const controller = new AbortController()
    deletingJobIds.value = ids
    deleteController = controller
    deleteScope = scope
    try {
      const accepted = requireOperationData(
        await deleteExportJobs(ids, idempotencyKey, controller.signal),
      )
      if (!isServerStateScopeCurrent(scope)) {
        throw new HttpError(translate('shell.http.requestFailed'), { kind: 'cancelled' })
      }
      deletionRetryKeys.delete(requestKey)
      await applyAcceptedDeletion(scope, accepted, controller.signal)
      return accepted
    } catch (error) {
      if (error instanceof HttpError && error.status === 404 && isServerStateScopeCurrent(scope)) {
        deletionRetryKeys.delete(requestKey)
        const accepted: ExportDeletionAccepted = {
          accepted_ids: ids,
          accepted_count: ids.length,
          removed_unread_count: 0,
        }
        await applyAcceptedDeletion(scope, accepted, controller.signal)
        return accepted
      }
      if (!shouldReuseIdempotencyKey(error)) deletionRetryKeys.delete(requestKey)
      if (error instanceof HttpError && error.status === 409 && isServerStateScopeCurrent(scope)) {
        await refreshAfterDeletion(scope, controller.signal)
      }
      throw error
    } finally {
      if (deleteController === controller) {
        deleteController = undefined
        deleteScope = undefined
        deletingJobIds.value = []
      }
      releaseJobActions(scope, ids)
    }
  }

  const stopScopeWatch = watch(
    useServerStateScope(),
    () => {
      // 未知结果只允许在原 scope 内重试；scope 切换后必须释放全部旧幂等意图。
      deletionRetryKeys.clear()
      if (cancelScope && !isServerStateScopeCurrent(cancelScope)) {
        cancelController?.abort()
        cancelController = undefined
        cancelScope = undefined
        cancellingJobId.value = undefined
      }
      if (downloadScope && !isServerStateScopeCurrent(downloadScope)) {
        downloadController?.abort()
        downloadController = undefined
        downloadScope = undefined
        downloadingJobId.value = undefined
      }
      if (deleteScope && !isServerStateScopeCurrent(deleteScope)) {
        deleteController?.abort()
        deleteController = undefined
        deleteScope = undefined
        deletingJobIds.value = []
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
      stopScopeWatch()
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
