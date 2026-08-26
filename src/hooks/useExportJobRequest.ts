import { Clock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useMutation } from '@tanstack/vue-query'
import { getCurrentScope, onScopeDispose } from 'vue'
import type { ExportJob } from '@/api/modules/exportJob'
import { publishExportJobEvent } from '@/app/exports/exportJobChannel'
import {
  exportJobListQueryKey,
  prependExportJob,
  type ExportJobIdentity,
} from '@/app/exports/exportJobCache'
import { translate } from '@/i18n'
import { HttpError, requireOperationData } from '@/shared/http/client'
import type { ApiResponse } from '@/shared/http/types'
import { createIdempotencyKey, shouldReuseIdempotencyKey } from '@/shared/http/idempotency'
import { queryClient } from '@/shared/query/client'
import { useUserStore } from '@/stores/user'

export type CreateExportJob = (
  idempotencyKey: string,
  signal: AbortSignal,
) => Promise<ApiResponse<ExportJob>>

interface SubmitExportVariables {
  create: CreateExportJob
  idempotencyKey: string
  identity: ExportJobIdentity
  intentSignature: string
  signal: AbortSignal
}

function currentIdentity(user = useUserStore()): ExportJobIdentity {
  if (user.sessionStatus !== 'authenticated' || !user.tenantId || !user.userId) {
    throw new HttpError(translate('shell.session.expired'), { status: 401, kind: 'http' })
  }
  return { tenantId: user.tenantId, userId: String(user.userId) }
}

function identityMatchesCurrent(
  user: ReturnType<typeof useUserStore>,
  identity: ExportJobIdentity,
): boolean {
  try {
    const current = currentIdentity(user)
    return current.tenantId === identity.tenantId && current.userId === identity.userId
  } catch {
    return false
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
  let activeIdentity: ExportJobIdentity | undefined
  let scopeDisposed = false
  let unsubscribeUser = () => {}

  const mutation = useMutation<ExportJob, HttpError, SubmitExportVariables>({
    mutationKey: ['export-job-create'],
    meta: { errorMode: 'global' },
    mutationFn: async (variables) =>
      requireOperationData(await variables.create(variables.idempotencyKey, variables.signal)),
    onSuccess: async (job, variables) => {
      intentKeys.delete(variables.intentSignature)
      if (!identityMatchesCurrent(user, variables.identity)) return
      await queryClient.cancelQueries({
        queryKey: exportJobListQueryKey(variables.identity.tenantId, variables.identity.userId),
        exact: true,
      })
      if (!identityMatchesCurrent(user, variables.identity)) return
      prependExportJob(queryClient, variables.identity, job)
      publishExportJobEvent({ type: 'created', ...variables.identity, jobId: job.id })
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

  function submitExport(intentSignature: string, create: CreateExportJob): Promise<ExportJob> {
    if (activePromise) return activePromise

    const identity = currentIdentity(user)
    const scopedIntent = `${identity.tenantId}\u0000${identity.userId}\u0000${intentSignature}`
    const idempotencyKey = intentKeys.get(scopedIntent) ?? createIdempotencyKey('export')
    intentKeys.set(scopedIntent, idempotencyKey)
    const controller = new AbortController()
    activeController = controller
    activeIdentity = identity
    const promise = mutation
      .mutateAsync({
        create,
        idempotencyKey,
        identity,
        intentSignature: scopedIntent,
        signal: controller.signal,
      })
      .finally(() => {
        if (activePromise === promise) {
          activePromise = undefined
          activeController = undefined
          activeIdentity = undefined
          if (scopeDisposed) unsubscribeUser()
        }
      })
    activePromise = promise
    return promise
  }

  unsubscribeUser = user.$subscribe(
    (_mutation, state) => {
      if (!activeController || !activeIdentity) return
      const nextUserId = String(state.userId || '')
      if (
        state.sessionStatus !== 'authenticated' ||
        state.tenantId !== activeIdentity.tenantId ||
        nextUserId !== activeIdentity.userId
      )
        activeController.abort()
    },
    { flush: 'sync' },
  )

  if (getCurrentScope()) {
    onScopeDispose(() => {
      scopeDisposed = true
      if (!activePromise) unsubscribeUser()
    })
  }

  return {
    pending: mutation.isPending,
    submitExport,
  }
}
