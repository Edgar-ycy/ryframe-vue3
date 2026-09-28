import { ElMessage } from 'element-plus'
import type { Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ExportJob } from '@/api/modules/exportJob'
import {
  exportJobDisplayName,
  exportJobStatusKey,
  isExportDownloadExpired,
} from '@/app/exports/exportJobPresentation'
import { useExportJobActions, type useExportJobList } from '@/app/exports/useExportJobs'
import { HttpError } from '@/shared/http/client'
import { beginServerStatePageOperation } from '@/shared/query/pageOperationScope'
import { confirmAction } from '@/utils/confirmAction'

type PageOperation = ReturnType<typeof beginServerStatePageOperation>
interface ExportPageActionContext {
  jobs: ReturnType<typeof useExportJobList>['jobs']
  selectedJobIds: Ref<string[]>
  visibleJobs: () => ExportJob[]
  beginPageOperation: () => readonly [PageOperation, () => boolean]
  refresh: ReturnType<typeof useExportJobList>['refresh']
}

export function useExportPageActions(context: ExportPageActionContext) {
  const { jobs, selectedJobIds, visibleJobs, beginPageOperation, refresh } = context
  const { t } = useI18n()
  const TERMINAL_STATUSES = new Set(['succeeded', 'failed', 'cancelled', 'expired'])
  const {
    cancelJob,
    cancellingJobId,
    deleteJobs,
    deletingJobIds,
    downloadJob,
    downloadingJobId,
    isJobActionBusy,
  } = useExportJobActions()

  function displayName(job: ExportJob): string {
    return exportJobDisplayName(job)
  }

  function statusLabel(status: string): string {
    return t(exportJobStatusKey(status))
  }

  function canCancel(status: string): boolean {
    return status === 'queued' || status === 'running'
  }

  function canDelete(status: string): boolean {
    return TERMINAL_STATUSES.has(status)
  }

  function isDownloadUnavailable(job: ExportJob): boolean {
    return isExportDownloadExpired(job)
  }

  async function handleCancel(job: ExportJob): Promise<void> {
    if (!canCancel(job.status) || cancellingJobId.value || isJobActionBusy(job.id)) return
    const [operation, ownsOperation] = beginPageOperation()
    const confirmed = await confirmAction(
      t('exportCenter.cancelConfirm', { name: displayName(job) }),
      t('exportCenter.cancelConfirmTitle'),
      { type: 'warning', confirmButtonText: t('exportCenter.cancel') },
    )
    if (!confirmed) return
    try {
      operation.assertCurrent(ownsOperation)
      if (cancellingJobId.value) return
      await cancelJob(job.id, operation.scope)
    } catch (actionError) {
      if (!canReportActionError(operation, ownsOperation, actionError)) return
      if (!(await refreshAfterAction(operation, ownsOperation))) return
      const current = jobs.value?.find((item) => item.id === job.id)
      if (current && !canCancel(current.status)) {
        ElMessage.info(`${displayName(current)}：${statusLabel(current.status)}`)
        return
      }
      ElMessage.error(t('exportCenter.cancelFailed'))
    }
  }

  async function handleDownload(job: ExportJob): Promise<void> {
    if (
      job.status !== 'succeeded' ||
      isDownloadUnavailable(job) ||
      downloadingJobId.value ||
      isJobActionBusy(job.id)
    )
      return
    const [operation, ownsOperation] = beginPageOperation()
    try {
      await downloadJob(job, operation.scope)
    } catch (error) {
      if (!canReportActionError(operation, ownsOperation, error)) return
      if (!(await refreshAfterAction(operation, ownsOperation))) return
      const current = jobs.value?.find((item) => item.id === job.id)
      if (current?.status === 'expired' || isDownloadUnavailable(current ?? job)) {
        ElMessage.error(t('exportCenter.downloadExpired'))
      } else if (error instanceof HttpError && error.status === 403) {
        ElMessage.error(t('exportCenter.downloadForbidden'))
      } else if (error instanceof HttpError && error.status === 404) {
        ElMessage.error(t('exportCenter.downloadMissing'))
      } else {
        ElMessage.error(t('exportCenter.downloadFailed'))
      }
    }
  }

  async function handleDelete(job: ExportJob): Promise<void> {
    await handleDeleteJobs([job])
  }

  async function handleBatchDelete(): Promise<void> {
    const selected = new Set(selectedJobIds.value)
    await handleDeleteJobs(
      visibleJobs().filter((job) => selected.has(job.id) && canDelete(job.status)),
    )
  }

  async function handleDeleteJobs(selectedJobs: readonly ExportJob[]): Promise<void> {
    if (
      selectedJobs.length === 0 ||
      selectedJobs.length > 100 ||
      deletingJobIds.value.length > 0 ||
      selectedJobs.some((job) => !canDelete(job.status) || isJobActionBusy(job.id))
    )
      return
    const [operation, ownsOperation] = beginPageOperation()
    const message =
      selectedJobs.length === 1
        ? t('exportCenter.deleteConfirm', { name: displayName(selectedJobs[0]!) })
        : t('exportCenter.deleteBatchConfirm', { count: selectedJobs.length })
    const confirmed = await confirmAction(message, t('exportCenter.deleteConfirmTitle'), {
      type: 'warning',
      confirmButtonText: t('exportCenter.delete'),
    })
    if (!confirmed) return
    try {
      operation.assertCurrent(ownsOperation)
      if (deletingJobIds.value.length > 0) return
      const accepted = await deleteJobs(
        selectedJobs.map((job) => job.id),
        operation.scope,
      )
      operation.apply(() => {
        const removed = new Set(accepted.accepted_ids)
        selectedJobIds.value = selectedJobIds.value.filter((id) => !removed.has(id))
        ElMessage.success(
          t(
            accepted.accepted_count === 1
              ? 'exportCenter.deleteSuccess'
              : 'exportCenter.deleteBatchSuccess',
            { count: accepted.accepted_count },
          ),
        )
      }, ownsOperation)
    } catch (actionError) {
      if (!canReportActionError(operation, ownsOperation, actionError)) return
      if (actionError instanceof HttpError && actionError.status === 409) {
        if (!(await refreshAfterAction(operation, ownsOperation))) return
        ElMessage.warning(t('exportCenter.deleteConflict'))
        return
      }
      ElMessage.error(t('exportCenter.deleteFailed'))
    }
  }

  async function refreshAfterAction(
    operation: ReturnType<typeof beginServerStatePageOperation>,
    ownsOperation: () => boolean,
  ): Promise<boolean> {
    if (!operation.isCurrent(ownsOperation)) return false
    try {
      await refresh()
    } catch {
      // 动作错误仍由调用方提示；补拉失败不应覆盖原始结果。
    }
    return operation.isCurrent(ownsOperation)
  }

  return {
    cancellingJobId,
    deletingJobIds,
    downloadingJobId,
    canCancel,
    canDelete,
    displayName,
    isDownloadUnavailable,
    statusLabel,
    handleCancel,
    handleDownload,
    handleDelete,
    handleBatchDelete,
  }
}

export function canReportActionError(
  operation: ReturnType<typeof beginServerStatePageOperation>,
  ownsOperation: () => boolean,
  error: unknown,
): boolean {
  const cancelled = error instanceof HttpError && error.kind === 'cancelled'
  return operation.isCurrent(ownsOperation) && !cancelled
}
