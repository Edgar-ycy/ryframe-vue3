import { ElMessage } from 'element-plus'
import { ref, type Ref } from 'vue'
import {
  cancelUserImport,
  downloadUserImportReport,
  type UserImportJob,
} from '@/api/modules/userImport'
import { downloadBlobDirect } from '@/hooks/useDownload'
import { assertServerStateScopeCurrent, invalidateServerStateResource } from '@/shared/query/client'
import {
  beginServerStatePageOperation,
  propagateServerStatePageOperationError,
} from '@/shared/query/pageOperationScope'
import { confirmServerStatePageOperation } from '@/shared/query/scopedConfirmation'
import type { ServerStateScope } from '@/shared/query/scope'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'
import { confirmAction } from '@/utils/confirmAction'

type Translate = (key: string, values?: Record<string, unknown>) => string
type CancelCommand = { job: UserImportJob; scope: ServerStateScope }

interface UserImportHistoryActionsOptions {
  findJob: (id: string) => UserImportJob | undefined
  refresh: () => Promise<void>
  t: Translate
  visible: Ref<boolean>
}

/** 导入取消与报告下载只允许作用于触发操作时的会话和抽屉代次。 */
export function useUserImportHistoryActions(options: UserImportHistoryActionsOptions) {
  const reportLoadingId = ref('')
  const generation = ref(0)
  let reportController: AbortController | undefined

  const cancelMutation = useServerStateMutation<unknown, CancelCommand>('user-imports', {
    invalidateOnSuccess: false,
    meta: { errorMode: 'silent' },
    mutationFn: (command) => {
      assertServerStateScopeCurrent(command.scope)
      return cancelUserImport(command.job.id)
    },
  })

  function owns(captured: number): () => boolean {
    return () => options.visible.value && generation.value === captured
  }

  function invalidate(): void {
    generation.value += 1
    reportController?.abort()
    reportController = undefined
    reportLoadingId.value = ''
  }

  function isCancelling(id: string): boolean {
    return cancelMutation.pending.value && cancelMutation.variables.value?.job.id === id
  }

  async function cancelImportById(id: string): Promise<void> {
    const job = options.findJob(id)
    if (!job || cancelMutation.pending.value) return
    const captured = generation.value
    const ownsOperation = owns(captured)
    const operation = await confirmServerStatePageOperation(
      () =>
        confirmAction(
          options.t('system.userImport.cancelConfirm', { name: job.source_name }),
          options.t('system.userImport.cancelConfirmTitle'),
          { type: 'warning' },
        ),
      ownsOperation,
    )
    if (!operation || cancelMutation.pending.value) return
    operation.assertCurrent(ownsOperation)
    try {
      await cancelMutation.mutateAsync({ job, scope: operation.scope })
    } catch (error) {
      propagateServerStatePageOperationError(error, operation, ownsOperation)
    }
    operation.assertCurrent(ownsOperation)
    await invalidateServerStateResource(operation.scope, 'user-imports')
    operation.assertCurrent(ownsOperation)
    await options.refresh()
    operation.apply(
      () => ElMessage.success(options.t('system.userImport.cancelSuccess')),
      ownsOperation,
    )
  }

  async function downloadReportById(id: string): Promise<void> {
    const job = options.findJob(id)
    if (!job || reportLoadingId.value) return
    const captured = generation.value
    const ownsOperation = owns(captured)
    const operation = beginServerStatePageOperation()
    const controller = new AbortController()
    reportController = controller
    operation.apply(() => {
      reportLoadingId.value = job.id
    }, ownsOperation)
    try {
      const blob = await downloadUserImportReport(job.id, controller.signal)
      operation.apply(() => {
        downloadBlobDirect(blob, `${job.source_name.replace(/\.xlsx$/iu, '')}-report.xlsx`)
        ElMessage.success(options.t('shell.download.success'))
      }, ownsOperation)
    } catch (error) {
      propagateServerStatePageOperationError(error, operation, ownsOperation)
    } finally {
      if (reportController === controller) {
        reportController = undefined
        if (operation.isCurrent(ownsOperation)) reportLoadingId.value = ''
      }
    }
  }

  return {
    cancelImportById,
    cancelMutation,
    downloadReportById,
    invalidate,
    isCancelling,
    reportLoadingId,
  }
}
