import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { HttpError } from '@/shared/http/client'
import { tenantQueryKey } from './client'

/**
 * 用于已鉴权、租户范围 API 读取的标准查询封装。租户标识和启用状态由调用方
 * 作为响应式输入传入，确保共享层不依赖业务状态；租户变更时会自然切换缓存范围。
 */
export function useTenantQuery<T>(
  tenantId: MaybeRefOrGetter<string | undefined>,
  isAuthenticated: MaybeRefOrGetter<boolean>,
  resource: string,
  params: () => unknown,
  queryFn: () => Promise<T>,
) {
  return useQuery<T, HttpError>({
    queryKey: computed(() => tenantQueryKey(toValue(tenantId), resource, params())),
    queryFn,
    enabled: computed(() => toValue(isAuthenticated)),
  })
}
