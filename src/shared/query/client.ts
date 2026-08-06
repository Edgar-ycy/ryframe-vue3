import {
  MutationCache,
  QueryCache,
  QueryClient,
  type QueryKey,
} from '@tanstack/vue-query'
import { HttpError } from '@/shared/http/client'

const SERVER_STATE_PREFIX = 'server-state'
export type ServerStateErrorMode = 'global' | 'silent'
export interface ServerStateMeta extends Record<string, unknown> {
  errorMode?: ServerStateErrorMode
}
type ServerStateErrorReporter = (error: HttpError) => void

declare module '@tanstack/vue-query' {
  interface Register {
    queryMeta: ServerStateMeta
    mutationMeta: ServerStateMeta
  }
}

let errorReporter: ServerStateErrorReporter | undefined

/** 配置 Query/Mutation Cache 唯一的全局错误出口。 */
export function configureServerStateErrorReporter(
  reporter: ServerStateErrorReporter | undefined,
): void {
  errorReporter = reporter
}

function errorMode(meta: ServerStateMeta | undefined): ServerStateErrorMode {
  return meta?.errorMode ?? 'global'
}

function reportServerStateError(error: unknown, meta: ServerStateMeta | undefined): void {
  if (errorMode(meta) === 'silent') return
  const normalized = error instanceof HttpError
    ? error
    : new HttpError(
        error instanceof Error ? error.message : '服务端状态请求失败',
        { kind: 'unknown', cause: error },
      )
  if (normalized.kind !== 'cancelled') errorReporter?.(normalized)
}

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof HttpError) {
    // 主动取消不是失败，不应重新发起已失效的请求。
    if (error.kind === 'cancelled') return false
    if (error.status !== undefined && error.status < 500) return false
  }
  return failureCount < 2
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => reportServerStateError(error, query.meta),
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _onMutateResult, mutation) => {
      reportServerStateError(error, mutation.meta)
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      retry: shouldRetry,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      retry: false,
    },
  },
})

/**
 * 构建不能跨越租户或会话边界的缓存键。请求参数保持为普通值，
 * 以便 Vue Query 能够确定性地进行比较。
 */
export function tenantQueryKey(
  tenantId: string | undefined,
  resource: string,
  params?: unknown,
): QueryKey {
  return [SERVER_STATE_PREFIX, tenantId || 'anonymous', resource, params ?? null]
}

/** 在登录身份变更或退出登录时清除全部已鉴权的服务端状态。 */
export function clearServerState(): void {
  queryClient.clear()
}

export function invalidateTenantServerState(tenantId: string): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: [SERVER_STATE_PREFIX, tenantId] })
}

/** 将资源的所有缓存变体标记为过期，而不盲目触发重新请求。 */
export function invalidateTenantResource(tenantId: string, resource: string): Promise<void> {
  return queryClient.invalidateQueries({
    queryKey: [SERVER_STATE_PREFIX, tenantId, resource],
    refetchType: 'none',
  })
}
