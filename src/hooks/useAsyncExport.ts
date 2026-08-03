import {
  computed,
  getCurrentScope,
  onScopeDispose,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue'
import { ElMessage } from 'element-plus'
import { downloadBlobDirect } from './useDownload'
import {
  downloadExportJob,
  getExportJob,
  type ExportJob,
} from '@/api/modules/exportJob'
import { translate } from '@/i18n'
import { HttpError, type HttpErrorKind } from '@/shared/http/client'
import type { ApiResponse } from '@/shared/http/types'
import { invalidateTenantResource } from '@/shared/query/client'
import { useTenantMutation } from '@/shared/query/useTenantMutation'

const POLL_INTERVAL_MS = 1000
const POLL_TIMEOUT_MS = 120000
const BACKGROUND_JOB_RESOURCE = 'background-jobs'

type CreateExportJob = (signal: AbortSignal) => Promise<ApiResponse<ExportJob>>

interface AsyncExportOptions {
  filename: string
}

interface AsyncExportVariables {
  create: CreateExportJob
  filename: string
  signal: AbortSignal
  tenantId: string | undefined
  jobCreated: boolean
}

function workflowError(message: string, kind: HttpErrorKind): HttpError {
  return new HttpError(message, { kind })
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw workflowError(translate('shell.http.requestFailed'), 'cancelled')
  }
}

function sleep(duration: number, signal: AbortSignal): Promise<void> {
  throwIfAborted(signal)
  return new Promise((resolve, reject) => {
    const timeout = globalThis.setTimeout(() => {
      signal.removeEventListener('abort', handleAbort)
      resolve()
    }, duration)
    const handleAbort = () => {
      globalThis.clearTimeout(timeout)
      reject(workflowError(translate('shell.http.requestFailed'), 'cancelled'))
    }
    signal.addEventListener('abort', handleAbort, { once: true })
  })
}

function responseData(response: ApiResponse<ExportJob>): ExportJob {
  if (!response.data) {
    throw workflowError(translate('shell.http.requestFailed'), 'invalid_response')
  }
  return response.data
}

/** 使用统一 Mutation 完成导出任务创建、轮询和下载，并支持整条链路取消。 */
export function useAsyncExport(tenantId: MaybeRefOrGetter<string | undefined>) {
  const launching = ref(false)
  let activeController: AbortController | undefined
  let activePromise: Promise<void> | undefined

  const mutation = useTenantMutation<void, AsyncExportVariables>(
    tenantId,
    BACKGROUND_JOB_RESOURCE,
    {
      meta: { errorMode: 'global' },
      mutationFn: async (variables) => {
        throwIfAborted(variables.signal)
        let job = responseData(await variables.create(variables.signal))
        variables.jobCreated = true
        throwIfAborted(variables.signal)
        const deadline = Date.now() + POLL_TIMEOUT_MS

        while (job.status === 'queued' || job.status === 'running') {
          if (Date.now() >= deadline) {
            throw workflowError(translate('shell.http.requestFailed'), 'timeout')
          }
          await sleep(POLL_INTERVAL_MS, variables.signal)
          job = responseData(await getExportJob(job.id, variables.signal))
          throwIfAborted(variables.signal)
        }

        if (job.status !== 'succeeded') {
          throw workflowError(
            job.error_message || translate('shell.http.requestFailed'),
            'unknown',
          )
        }

        const blob = await downloadExportJob(job.id, variables.signal)
        throwIfAborted(variables.signal)
        downloadBlobDirect(blob, job.result_file_name || variables.filename)
      },
      onSuccess: () => {
        ElMessage.success(translate('shell.download.success'))
      },
      onError: async (_error, variables) => {
        if (variables.jobCreated && variables.tenantId) {
          await invalidateTenantResource(variables.tenantId, BACKGROUND_JOB_RESOURCE)
        }
      },
    },
  )

  const pending = computed(() => launching.value || mutation.pending.value)

  function cancel(): void {
    activeController?.abort()
  }

  function exportAndDownload(
    create: CreateExportJob,
    options: AsyncExportOptions,
  ): Promise<void> {
    if (activePromise) return activePromise

    const controller = new AbortController()
    activeController = controller
    launching.value = true
    const variables: AsyncExportVariables = {
      create,
      filename: options.filename,
      signal: controller.signal,
      tenantId: toValue(tenantId),
      jobCreated: false,
    }
    let mutationPromise: Promise<void>
    try {
      mutationPromise = mutation.mutateAsync(variables)
    }
    catch (error) {
      mutationPromise = Promise.reject(error)
    }
    const promise = mutationPromise.finally(() => {
      if (activeController === controller) activeController = undefined
      if (activePromise === promise) activePromise = undefined
      launching.value = false
    })
    activePromise = promise
    return promise
  }

  watch(
    () => toValue(tenantId),
    (current, previous) => {
      if (current !== previous) cancel()
    },
    { flush: 'sync' },
  )
  if (getCurrentScope()) onScopeDispose(cancel)

  return { cancel, exportAndDownload, pending }
}
