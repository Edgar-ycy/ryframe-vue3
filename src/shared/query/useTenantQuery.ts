import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { HttpError } from '@/shared/http/client'
import { tenantQueryKey, type ServerStateMeta } from './client'

export interface TenantQueryPolicy {
  staleTime?: number
  gcTime?: number
  refetchOnReconnect?: boolean | 'always'
  refetchOnMount?: boolean | 'always'
  refetchOnWindowFocus?: boolean | 'always'
  refetchInterval?: number | false
  meta?: ServerStateMeta
}

const LOW_FREQUENCY_RESOURCES = new Set([
  'configs',
  'dict-types',
  'dict-data',
  'role-options',
  'departments',
  'permissions',
  'menus',
])

function resourcePolicy(resource: string): TenantQueryPolicy {
  if (LOW_FREQUENCY_RESOURCES.has(resource)) {
    return { staleTime: 5 * 60_000, gcTime: 30 * 60_000 }
  }
  if (resource.startsWith('monitor-')) {
    return {
      staleTime: 0,
      gcTime: 10 * 60_000,
      refetchInterval: 30_000,
      refetchOnReconnect: false,
      refetchOnMount: false,
    }
  }
  return {}
}

/**
 * 用于已鉴权、租户范围 API 读取的标准查询封装。租户标识和启用状态由调用方
 * 作为响应式输入传入，确保共享层不依赖业务状态；租户变更时会自然切换缓存范围。
 */
export function useTenantQuery<T>(
  tenantId: MaybeRefOrGetter<string | undefined>,
  isAuthenticated: MaybeRefOrGetter<boolean>,
  resource: string,
  params: () => unknown,
  queryFn: (signal: AbortSignal) => Promise<T>,
  policy: TenantQueryPolicy = {},
) {
  return useQuery<T, HttpError>({
    ...resourcePolicy(resource),
    ...policy,
    queryKey: computed(() => tenantQueryKey(toValue(tenantId), resource, params())),
    queryFn: ({ signal }) => queryFn(signal),
    enabled: computed(() => toValue(isAuthenticated)),
  })
}
