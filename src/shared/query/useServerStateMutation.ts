import { computed, watch } from 'vue'
import {
  useMutation,
  type MutationFunctionContext,
  type MutationOptions,
  type QueryClient,
} from '@tanstack/vue-query'
import { HttpError } from '@/shared/http/client'
import {
  assertServerStateScopeCurrent,
  getServerStateScope,
  invalidateServerStateResource,
  isServerStateScopeCurrent,
  serverStateMutationKey,
  useServerStateScope,
} from './client'
import type { ActiveServerStateScope } from './scope'

export type ServerStateMutationContext = MutationFunctionContext & { signal: AbortSignal }

export type ServerStateMutationOptions<TData, TVariables, TOnMutateResult = unknown> = Omit<
  MutationOptions<TData, HttpError, TVariables, TOnMutateResult>,
  'mutationFn' | 'mutationKey' | 'onSuccess' | 'onError' | 'onSettled'
> & {
  /** 从本次调用变量取得主动取消信号，由统一入口与会话信号组合。 */
  callerSignal?: (variables: Readonly<TVariables>) => AbortSignal | undefined
  mutationFn: (variables: TVariables, context: ServerStateMutationContext) => Promise<TData>
  onSuccess?: NonNullable<
    MutationOptions<TData, HttpError, TVariables, TOnMutateResult>['onSuccess']
  >
  onError?: NonNullable<MutationOptions<TData, HttpError, TVariables, TOnMutateResult>['onError']>
  onSettled?: NonNullable<
    MutationOptions<TData, HttpError, TVariables, TOnMutateResult>['onSettled']
  >
}

function cancelledScopeError(cause?: unknown): HttpError {
  return new HttpError('会话已切换，操作已取消', {
    status: 401,
    kind: 'cancelled',
    cause,
  })
}

function requireActiveScope(): ActiveServerStateScope {
  const scope = getServerStateScope()
  if (!scope || scope.signal.aborted) throw cancelledScopeError()
  return scope
}

function guardedMutationOptions<TData, TVariables, TOnMutateResult>(
  resource: string,
  options: ServerStateMutationOptions<TData, TVariables, TOnMutateResult>,
  scope: ActiveServerStateScope,
): MutationOptions<TData, HttpError, TVariables, TOnMutateResult> {
  const { callerSignal, mutationFn, onSuccess, onError, onSettled, ...mutationOptions } = options
  return {
    ...mutationOptions,
    mutationKey: serverStateMutationKey(scope, resource),
    mutationFn: async (variables, context) => {
      assertServerStateScopeCurrent(scope)
      try {
        const requestedSignal = callerSignal?.(variables)
        const signal = requestedSignal
          ? AbortSignal.any([requestedSignal, scope.signal])
          : scope.signal
        const data = await mutationFn(variables, { ...context, signal })
        assertServerStateScopeCurrent(scope)
        return data
      } catch (error) {
        assertServerStateScopeCurrent(scope, error)
        throw error
      }
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      if (!isServerStateScopeCurrent(scope)) return
      await onSuccess?.(data, variables, onMutateResult, context)
      if (isServerStateScopeCurrent(scope)) await invalidateServerStateResource(scope, resource)
    },
    onError: async (error, variables, onMutateResult, context) => {
      if (!isServerStateScopeCurrent(scope)) return
      await onError?.(error, variables, onMutateResult, context)
    },
    onSettled: async (data, error, variables, onMutateResult, context) => {
      if (!isServerStateScopeCurrent(scope)) return
      await onSettled?.(data, error, variables, onMutateResult, context)
    },
  }
}

/** 统一会话范围写操作；范围切换时重置观察状态并屏蔽旧操作回调。 */
export function useServerStateMutation<TData, TVariables, TOnMutateResult = unknown>(
  resource: string,
  options: ServerStateMutationOptions<TData, TVariables, TOnMutateResult>,
) {
  const scope = useServerStateScope()
  const mutation = useMutation<TData, HttpError, TVariables, TOnMutateResult>(
    computed(() => {
      const current = scope.value
      if (!current) {
        return {
          ...options,
          mutationKey: ['server-state-inactive', resource],
          mutationFn: async () => {
            throw cancelledScopeError()
          },
        }
      }
      return guardedMutationOptions(resource, options, current)
    }),
  )

  watch(
    () => scope.value?.sessionEpoch,
    () => mutation.reset(),
    { flush: 'sync' },
  )

  return { ...mutation, pending: mutation.isPending }
}

/** 在 Vue 组件之外仍通过同一 MutationCache 与范围守卫执行写操作。 */
export async function executeServerStateMutation<TData, TVariables, TOnMutateResult = unknown>(
  client: QueryClient,
  resource: string,
  variables: TVariables,
  options: ServerStateMutationOptions<TData, TVariables, TOnMutateResult>,
): Promise<TData> {
  const scope = requireActiveScope()
  const mutation = client
    .getMutationCache()
    .build(client, guardedMutationOptions(resource, options, scope))
  return mutation.execute(variables)
}
