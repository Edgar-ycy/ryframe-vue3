import { QueryClient, type QueryKey } from '@tanstack/vue-query'
import { HttpError } from '@/shared/http/client'

const SERVER_STATE_PREFIX = 'server-state'

function shouldRetry(failureCount: number, error: unknown): boolean {
  // 请求错误已由 HTTP 边界层上报。后台重试校验或鉴权失败只会产生重复提示。
  if (error instanceof HttpError && error.status !== undefined && error.status < 500) {
    return false
  }
  return failureCount < 1
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: shouldRetry,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
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
