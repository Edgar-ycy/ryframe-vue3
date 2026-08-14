import { getCurrentScope, onScopeDispose, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  cancelExportJob,
  downloadExportJob,
  getExportJob,
  type ExportJob,
} from '@/api/modules/exportJob'
import { downloadBlobDirect } from '@/hooks/useDownload'
import { translate } from '@/i18n'
import { HttpError, requireOperationData } from '@/shared/http/client'
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

export function useExportJobActions() {
  const user = useUserStore()
  const cancellingJobId = ref<string>()
  const downloadingJobId = ref<string>()
  let cancelController: AbortController | undefined
  let downloadController: AbortController | undefined
  let cancelIdentity: ExportJobIdentity | undefined
  let downloadIdentity: ExportJobIdentity | undefined

  function identityStillCurrent(identity: ExportJobIdentity): boolean {
    const latest = currentExportJobIdentity()
    return latest !== undefined && sameExportJobIdentity(identity, latest)
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
    }
    catch {
      await queryClient.invalidateQueries({
        queryKey: exportJobListQueryKey(identity.tenantId, identity.userId),
        exact: true,
      })
    }
  }

  async function cancelJob(jobId: string): Promise<ExportJob> {
    if (cancellingJobId.value) {
      throw new HttpError(translate('shell.http.requestFailed'), { status: 409, kind: 'http' })
    }
    const identity = currentExportJobIdentity()
    if (!identity) throw new HttpError(translate('shell.session.expired'), { status: 401 })
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
    }
    catch (error) {
      await reconcileAfterActionError(identity, jobId, error)
      throw error
    }
    finally {
      if (cancelController === controller) {
        cancelController = undefined
        cancelIdentity = undefined
        cancellingJobId.value = undefined
      }
    }
  }

  async function downloadJob(job: ExportJob): Promise<void> {
    if (downloadingJobId.value) return
    const identity = currentExportJobIdentity()
    if (!identity) throw new HttpError(translate('shell.session.expired'), { status: 401 })
    const controller = new AbortController()
    downloadingJobId.value = job.id
    downloadController = controller
    downloadIdentity = identity
    try {
      const blob = await downloadExportJob(job.id, controller.signal)
      if (!identityStillCurrent(identity)) {
        throw new HttpError(translate('shell.http.requestFailed'), { kind: 'cancelled' })
      }
      downloadBlobDirect(
        blob,
        job.result_file_name || translate('shell.download.defaultFilename'),
      )
      ElMessage.success(translate('shell.download.success'))
    }
    catch (error) {
      await reconcileAfterActionError(identity, job.id, error)
      throw error
    }
    finally {
      if (downloadController === controller) {
        downloadController = undefined
        downloadIdentity = undefined
        downloadingJobId.value = undefined
      }
    }
  }

  const unsubscribeUser = user.$subscribe((_mutation, state) => {
    const stateIdentity = state.sessionStatus === 'authenticated' && state.tenantId && state.userId
      ? { tenantId: state.tenantId, userId: String(state.userId) }
      : undefined
    if (cancelIdentity && (!stateIdentity || !sameExportJobIdentity(cancelIdentity, stateIdentity))) {
      cancelController?.abort()
    }
    if (downloadIdentity && (!stateIdentity || !sameExportJobIdentity(downloadIdentity, stateIdentity))) {
      downloadController?.abort()
    }
  }, { flush: 'sync' })

  if (getCurrentScope()) {
    onScopeDispose(() => {
      cancelController?.abort()
      downloadController?.abort()
      unsubscribeUser()
    })
  }

  return { cancelJob, cancellingJobId, downloadJob, downloadingJobId }
}
/**
 * 全局协调器只读取活跃任务详情，四个并发槽位限制单轮压力；列表本身不轮询。
 * 初次读取只建立状态基线，只有本会话观察到的活跃到终态转换才会回调。
 */
