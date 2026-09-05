import { getExportJob } from '@/api/modules/exportJob'
import { HttpError, requireOperationData } from '@/shared/http/client'
import { isServerStateScopeCurrent, queryClient } from '@/shared/query/client'
import type { ServerStateScope } from '@/shared/query/scope'
import { mergeExportJob, removeExportJob } from '../exportJobCache'

export async function refreshExportJob(
  scope: ServerStateScope,
  jobId: string,
  controller: AbortController,
  refreshList: () => Promise<void>,
): Promise<void> {
  if (controller.signal.aborted || !isServerStateScopeCurrent(scope)) return
  try {
    const job = requireOperationData(await getExportJob(jobId, controller.signal))
    if (controller.signal.aborted || !isServerStateScopeCurrent(scope)) return
    mergeExportJob(queryClient, scope, job)
  } catch (error) {
    if (controller.signal.aborted || !isServerStateScopeCurrent(scope)) return
    if (!(error instanceof HttpError)) return
    if (error.kind === 'cancelled') return
    if (error.status === 403 || error.status === 404) {
      removeExportJob(queryClient, scope, jobId)
      return
    }
    if (error.status === 409) {
      try {
        if (controller.signal.aborted || !isServerStateScopeCurrent(scope)) return
        const latest = requireOperationData(await getExportJob(jobId, controller.signal))
        if (controller.signal.aborted || !isServerStateScopeCurrent(scope)) return
        mergeExportJob(queryClient, scope, latest)
      } catch (retryError) {
        if (controller.signal.aborted || !isServerStateScopeCurrent(scope)) return
        if (retryError instanceof HttpError && retryError.kind === 'cancelled') return
        try {
          if (controller.signal.aborted || !isServerStateScopeCurrent(scope)) return
          await refreshList()
        } catch {
          // 本轮对账失败时保留活跃任务，下一轮继续确认。
        }
      }
    }
  }
}
