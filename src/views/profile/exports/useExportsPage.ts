import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import type { ExportJob } from '@/api/modules/exportJob'
import { exportJobResourceKey } from '@/app/exports/exportJobPresentation'
import { useExportJobList, useExportNotificationState } from '@/app/exports/useExportJobs'
import { useKeepAlivePageActive } from '@/hooks/useKeepAlivePageActive'
import { useServerStateScope } from '@/shared/query/client'
import { beginServerStatePageOperation } from '@/shared/query/pageOperationScope'
import { canReportActionError, useExportPageActions } from './useExportPageActions'

export function useExportsPage() {
  const { t } = useI18n()
  const pageActive = ref(true)
  const statusFilter = ref('')
  const resourceFilter = ref('')
  const selectedJobIds = ref<string[]>([])
  const errorDialogVisible = ref(false)
  const selectedErrorJob = ref<ExportJob>()
  let pageGeneration = 0

  const { jobs, loading, error, refresh } = useExportJobList(() => pageActive.value)
  const { markVisibleNotificationsRead } = useExportNotificationState(() => pageActive.value)
  const {
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
  } = useExportPageActions({ jobs, selectedJobIds, visibleJobs, beginPageOperation, refresh })

  useKeepAlivePageActive(pageActive, handleRefresh)
  const stopScopeWatch = watch(useServerStateScope(), invalidatePageOperations, { flush: 'sync' })
  onDeactivated(invalidatePageOperations)
  onBeforeUnmount(() => {
    pageGeneration += 1
    stopScopeWatch()
  })

  onMounted(() => {
    void handleRefresh()
  })

  const STATUS_OPTIONS = [
    'queued',
    'running',
    'succeeded',
    'failed',
    'cancelled',
    'expired',
  ] as const
  const RESOURCE_OPTIONS = [
    'users',
    'roles',
    'posts',
    'configs',
    'dict-types',
    'operlogs',
    'loginlogs',
  ] as const

  watch(
    [jobs, statusFilter, resourceFilter],
    () => {
      const visibleTerminalIds = new Set(
        visibleJobs()
          .filter((job) => canDelete(job.status))
          .map((job) => job.id),
      )
      const selected = selectedJobIds.value.filter((id) => visibleTerminalIds.has(id))
      if (selected.length !== selectedJobIds.value.length) selectedJobIds.value = selected
    },
    { flush: 'sync' },
  )

  function visibleJobs(): ExportJob[] {
    return (jobs.value ?? []).filter(
      (job) =>
        (!statusFilter.value || job.status === statusFilter.value) &&
        (!resourceFilter.value || job.resource === resourceFilter.value),
    )
  }

  function handleVisibleJobsChange(): void {
    const [operation, ownsOperation] = beginPageOperation()
    if (!operation.isCurrent(ownsOperation)) return
    void markVisibleNotificationsRead(visibleJobs()).catch(() => undefined)
  }

  function resourceLabel(resource: string): string {
    return t(exportJobResourceKey(resource))
  }

  function listErrorMessage(value: unknown): string {
    return value instanceof Error && value.message ? value.message : t('exportCenter.loadFailed')
  }

  function showError(job: ExportJob): void {
    selectedErrorJob.value = job
    errorDialogVisible.value = true
  }

  async function handleRefresh(): Promise<void> {
    const [operation, ownsOperation] = beginPageOperation()
    try {
      await refresh()
      operation.assertCurrent(ownsOperation)
    } catch (error) {
      if (!canReportActionError(operation, ownsOperation, error)) return
      ElMessage.error(t('exportCenter.loadFailed'))
      return
    }
    try {
      await markVisibleNotificationsRead(visibleJobs())
    } catch {
      // 已读确认失败时保留徽标，不把已成功加载的任务列表误报为读取失败。
    }
  }

  function beginPageOperation() {
    const operation = beginServerStatePageOperation()
    const generation = pageGeneration
    return [operation, () => pageActive.value && pageGeneration === generation] as const
  }

  function invalidatePageOperations(): void {
    pageGeneration += 1
    selectedJobIds.value = []
    selectedErrorJob.value = undefined
    errorDialogVisible.value = false
  }

  return {
    t,
    loading,
    error,
    listErrorMessage,
    statusFilter,
    resourceFilter,
    STATUS_OPTIONS,
    RESOURCE_OPTIONS,
    statusLabel,
    resourceLabel,
    handleVisibleJobsChange,
    deletingJobIds,
    selectedJobIds,
    handleBatchDelete,
    cancellingJobId,
    downloadingJobId,
    jobs,
    visibleJobs,
    canCancel,
    canDelete,
    displayName,
    isDownloadUnavailable,
    handleCancel,
    handleDelete,
    handleDownload,
    showError,
    errorDialogVisible,
    selectedErrorJob,
    handleRefresh,
  }
}
