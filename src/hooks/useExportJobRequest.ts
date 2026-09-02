import { Clock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getCurrentScope, onScopeDispose, watch } from 'vue'
import type { ExportJob } from '@/api/modules/exportJob'
import { publishExportJobEvent } from '@/app/exports/exportJobChannel'
import {
  exportJobListQueryKey,
  EXPORT_JOBS_RESOURCE,
  prependExportJob,
} from '@/app/exports/exportJobCache'
import { translate } from '@/i18n'
import { HttpError, requireOperationData } from '@/shared/http/client'
import type { ApiResponse } from '@/shared/http/types'
import { createIdempotencyKey, shouldReuseIdempotencyKey } from '@/shared/http/idempotency'
import {
  assertServerStateScopeCurrent,
  getServerStateScope,
  isServerStateScopeCurrent,
  queryClient,
  useServerStateScope,
} from '@/shared/query/client'
import { sameServerStateScope, type ServerStateScope } from '@/shared/query/scope'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'
import { useUserStore } from '@/stores/user'

export type CreateExportJob = (
  idempotencyKey: string,
  signal: AbortSignal,
) => Promise<ApiResponse<ExportJob>>

interface SubmitExportVariables {
  create: CreateExportJob
  idempotencyKey: string
  scope: ServerStateScope
  intentSignature: string
  signal: AbortSignal
}

function currentScope(user = useUserStore()): ServerStateScope {
  if (user.sessionStatus !== 'authenticated' || !user.tenantId || !user.userId) {
    throw new HttpError(translate('shell.session.expired'), { status: 401, kind: 'http' })
  }
  const scope = getServerStateScope()
  if (!scope || scope.tenantId !== user.tenantId || scope.subjectId !== String(user.userId))
    throw new HttpError(translate('shell.session.expired'), { status: 401, kind: 'http' })
  return {
    tenantId: scope.tenantId,
    subjectId: scope.subjectId,
    sessionEpoch: scope.sessionEpoch,
  }
}

/**
 * 创建请求只负责将任务可靠入队。网络结果未知或服务端异常时保留幂等键，
 * 用户再次提交相同意图会安全复用；成功或明确客户端错误后才清除。
 */
export function useExportJobRequest() {
  const user = useUserStore()
  const intentKeys = new Map<string, string>()
  let activePromise: Promise<ExportJob> | undefined
  let activeController: AbortController | undefined
  let activeScope: ServerStateScope | undefined
  let scopeDisposed = false
  let stopScopeWatch = () => {}

  const mutation = useServerStateMutation<ExportJob, SubmitExportVariables>(EXPORT_JOBS_RESOURCE, {
    meta: { errorMode: 'global' },
    callerSignal: (variables) => variables.signal,
    mutationFn: async (variables, context) =>
      requireOperationData(await variables.create(variables.idempotencyKey, context.signal)),
    onSuccess: async (job, variables) => {
      intentKeys.delete(variables.intentSignature)
      if (!isServerStateScopeCurrent(variables.scope)) return
      await queryClient.cancelQueries({
        queryKey: exportJobListQueryKey(variables.scope),
        exact: true,
      })
      if (!isServerStateScopeCurrent(variables.scope)) return
      prependExportJob(queryClient, variables.scope, job)
      publishExportJobEvent({ type: 'created', ...variables.scope, jobId: job.id })
      ElMessage({
        message: translate('exportCenter.submitted'),
        type: 'info',
        icon: Clock,
        showClose: false,
      })
    },
    onError: (error, variables) => {
      if (!shouldReuseIdempotencyKey(error)) {
        intentKeys.delete(variables.intentSignature)
      }
    },
  })

  function submitExport(
    expectedScope: ServerStateScope,
    intentSignature: string,
    create: CreateExportJob,
  ): Promise<ExportJob> {
    assertServerStateScopeCurrent(expectedScope)
    const scope = currentScope(user)
    if (!sameServerStateScope(expectedScope, scope)) {
      throw new HttpError('会话已切换，导出已取消', { status: 401, kind: 'cancelled' })
    }
    if (activePromise && sameServerStateScope(activeScope, scope)) return activePromise
    if (activePromise) activeController?.abort()
    const scopedIntent = `${scope.tenantId}\u0000${scope.subjectId}\u0000${scope.sessionEpoch}\u0000${intentSignature}`
    const idempotencyKey = intentKeys.get(scopedIntent) ?? createIdempotencyKey('export')
    intentKeys.set(scopedIntent, idempotencyKey)
    const controller = new AbortController()
    activeController = controller
    activeScope = scope
    const promise = mutation
      .mutateAsync({
        create,
        idempotencyKey,
        scope,
        intentSignature: scopedIntent,
        signal: controller.signal,
      })
      .finally(() => {
        if (!isServerStateScopeCurrent(scope)) intentKeys.delete(scopedIntent)
        if (activePromise === promise) {
          activePromise = undefined
          activeController = undefined
          activeScope = undefined
          if (scopeDisposed) stopScopeWatch()
        }
      })
    activePromise = promise
    return promise
  }

  stopScopeWatch = watch(
    useServerStateScope(),
    () => {
      // 网络结果未知的幂等键只能由原 scope 复用，切换后无条件丢弃旧意图。
      intentKeys.clear()
      if (activeController && activeScope && !isServerStateScopeCurrent(activeScope)) {
        activeController.abort()
      }
    },
    { flush: 'sync' },
  )

  if (getCurrentScope()) {
    onScopeDispose(() => {
      scopeDisposed = true
      intentKeys.clear()
      if (!activePromise) stopScopeWatch()
    })
  }

  return {
    pending: mutation.isPending,
    submitExport,
  }
}
