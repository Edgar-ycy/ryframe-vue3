import { ElMessage } from 'element-plus'
import { onBeforeUnmount, onDeactivated, ref, watch, type Ref } from 'vue'
import {
  previewDataRetention,
  runDataRetention,
  type DataRetentionPreview,
} from '@/api/modules/monitor'
import { requireOperationData } from '@/shared/http/client'
import { createIdempotencyKey, shouldReuseIdempotencyKey } from '@/shared/http/idempotency'
import {
  assertServerStateScopeCurrent,
  invalidateServerStateResource,
  isServerStateScopeCurrent,
  useServerStateScope,
} from '@/shared/query/client'
import { beginServerStatePageOperation } from '@/shared/query/pageOperationScope'
import { propagateServerStatePageOperationError } from '@/shared/query/pageOperationScope'
import { confirmServerStatePageOperation } from '@/shared/query/scopedConfirmation'
import type { ServerStateScope } from '@/shared/query/scope'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'
import { confirmAction } from '@/utils/confirmAction'
import {
  MONITOR_JOBS_RESOURCE,
  MONITOR_JOB_STATS_RESOURCE,
  MONITOR_RETENTION_RUNS_RESOURCE,
} from '../queryResources'

type Translate = (key: string) => string
type RunCommand = { idempotencyKey: string; scope: ServerStateScope }

/** 数据留存预览与执行命令的会话、页面和幂等键所有权。 */
export function useRetentionPageActions(
  t: Translate,
  pageActive: Ref<boolean>,
  refreshRuns: () => Promise<void>,
) {
  const preview = ref<DataRetentionPreview>()
  const previewLoading = ref(false)
  const previewError = ref('')
  const pageGeneration = ref(0)
  let previewController: AbortController | undefined
  let pendingRunKey: string | undefined

  const runMutation = useServerStateMutation<unknown, RunCommand>(MONITOR_RETENTION_RUNS_RESOURCE, {
    invalidateOnSuccess: false,
    meta: { errorMode: 'silent' },
    mutationFn: (command) => {
      assertServerStateScopeCurrent(command.scope)
      return runDataRetention(command.idempotencyKey)
    },
  })

  function owns(generation: number): () => boolean {
    return () => pageActive.value && pageGeneration.value === generation
  }

  function cancelPreview(clearProjection = false): void {
    previewController?.abort()
    previewController = undefined
    previewLoading.value = false
    if (clearProjection) {
      preview.value = undefined
      previewError.value = ''
    }
  }

  function invalidatePage(clearRetry: boolean): void {
    pageGeneration.value += 1
    cancelPreview(true)
    if (clearRetry) pendingRunKey = undefined
  }

  watch(useServerStateScope(), () => invalidatePage(true), { flush: 'sync' })
  onDeactivated(() => invalidatePage(false))
  onBeforeUnmount(() => invalidatePage(true))

  async function loadPreview(): Promise<void> {
    cancelPreview()
    const generation = pageGeneration.value
    const ownsOperation = owns(generation)
    const operation = beginServerStatePageOperation()
    const controller = new AbortController()
    previewController = controller
    operation.apply(() => {
      previewLoading.value = true
      previewError.value = ''
    }, ownsOperation)
    try {
      const result = requireOperationData(await previewDataRetention(controller.signal))
      operation.apply(() => {
        preview.value = result
      }, ownsOperation)
    } catch (error) {
      if (operation.isCurrent(ownsOperation) && !controller.signal.aborted) {
        operation.apply(() => {
          preview.value = undefined
          previewError.value = error instanceof Error ? error.message : String(error)
        }, ownsOperation)
      }
    } finally {
      if (previewController === controller) {
        previewController = undefined
        if (operation.isCurrent(ownsOperation)) previewLoading.value = false
      }
    }
  }

  async function handleRun(): Promise<void> {
    if (runMutation.pending.value) return
    const generation = pageGeneration.value
    const ownsOperation = owns(generation)
    const operation = await confirmServerStatePageOperation(
      () =>
        confirmAction(t('monitor.retention.runConfirm'), t('monitor.retention.runConfirmTitle'), {
          type: 'error',
          confirmButtonText: t('monitor.retention.runNow'),
        }),
      ownsOperation,
    )
    if (!operation || runMutation.pending.value) return
    const key = pendingRunKey ?? createIdempotencyKey('retention')
    try {
      operation.assertCurrent(ownsOperation)
      await runMutation.mutateAsync({ idempotencyKey: key, scope: operation.scope })
      pendingRunKey = undefined
    } catch (error) {
      if (isServerStateScopeCurrent(operation.scope)) {
        pendingRunKey = shouldReuseIdempotencyKey(error) ? key : undefined
      }
      propagateServerStatePageOperationError(error, operation, ownsOperation)
    }
    if (!operation.isCurrent(ownsOperation)) return
    operation.apply(() => ElMessage.success(t('monitor.retention.runSuccess')), ownsOperation)
    await Promise.all([
      refreshRuns(),
      invalidateServerStateResource(operation.scope, MONITOR_RETENTION_RUNS_RESOURCE),
      invalidateServerStateResource(operation.scope, MONITOR_JOBS_RESOURCE),
      invalidateServerStateResource(operation.scope, MONITOR_JOB_STATS_RESOURCE),
    ])
    operation.assertCurrent(ownsOperation)
  }

  return {
    handleRun,
    loadPreview,
    preview,
    previewError,
    previewLoading,
    runPending: runMutation.pending,
  }
}
