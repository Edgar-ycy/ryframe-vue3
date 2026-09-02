import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import {
  useQuery,
  type UseQueryDefinedReturnType,
  type UseQueryOptions,
  type UseQueryReturnType,
} from '@tanstack/vue-query'
import { HttpError } from '@/shared/http/client'
import {
  assertServerStateScopeCurrent,
  getServerStateScope,
  serverStateQueryKey,
  useServerStateScope,
  type ServerStateMeta,
} from './client'

export interface ServerStateQueryPolicy<TQueryData, TSelected = TQueryData> {
  staleTime?: number
  gcTime?: number
  refetchOnReconnect?: boolean | 'always'
  refetchOnMount?: boolean | 'always'
  refetchOnWindowFocus?: boolean | 'always'
  refetchInterval?: number | false
  retry?: boolean | number | ((failureCount: number, error: HttpError) => boolean)
  initialData?: TQueryData | (() => TQueryData)
  select?: (data: TQueryData) => TSelected
  meta?: ServerStateMeta
}

type ServerStateResourcePolicy = Pick<
  ServerStateQueryPolicy<never>,
  'gcTime' | 'refetchInterval' | 'refetchOnMount' | 'refetchOnReconnect' | 'staleTime'
>

const LOW_FREQUENCY_RESOURCES = new Set([
  'configs',
  'dict-types',
  'dict-data',
  'role-options',
  'departments',
  'permissions',
  'menus',
])

function resourcePolicy(resource: string): ServerStateResourcePolicy {
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

/** 已鉴权服务端读取的唯一组合式入口；启用状态会与响应式会话范围自动合并。 */
export function useServerStateQuery<TQueryData, TSelected = TQueryData>(
  enabled: MaybeRefOrGetter<boolean>,
  resource: string,
  params: () => unknown,
  queryFn: (signal: AbortSignal) => Promise<TQueryData>,
  policy: ServerStateQueryPolicy<TQueryData, TSelected> & {
    initialData: TQueryData | (() => TQueryData)
  },
): UseQueryDefinedReturnType<TSelected, HttpError>
export function useServerStateQuery<TQueryData, TSelected = TQueryData>(
  enabled: MaybeRefOrGetter<boolean>,
  resource: string,
  params: () => unknown,
  queryFn: (signal: AbortSignal) => Promise<TQueryData>,
  policy?: ServerStateQueryPolicy<TQueryData, TSelected>,
): UseQueryReturnType<TSelected, HttpError>
export function useServerStateQuery<TQueryData, TSelected = TQueryData>(
  enabled: MaybeRefOrGetter<boolean>,
  resource: string,
  params: () => unknown,
  queryFn: (signal: AbortSignal) => Promise<TQueryData>,
  policy: ServerStateQueryPolicy<TQueryData, TSelected> = {},
) {
  const scope = useServerStateScope()
  const options = {
    ...resourcePolicy(resource),
    ...policy,
    queryKey: computed(() => {
      const current = scope.value
      return current
        ? serverStateQueryKey(current, resource, params())
        : (['server-state-inactive', resource, params()] as const)
    }),
    queryFn: async ({ queryKey, signal }) => {
      const current = getServerStateScope()
      const matchesScheduledScope =
        current !== undefined &&
        queryKey[0] === 'server-state' &&
        queryKey[1] === current.tenantId &&
        queryKey[2] === current.subjectId &&
        queryKey[3] === current.sessionEpoch &&
        queryKey[4] === resource
      if (!matchesScheduledScope || current.signal.aborted) {
        throw new HttpError('会话已切换，请求已取消', { status: 401, kind: 'cancelled' })
      }
      try {
        const data = await queryFn(AbortSignal.any([signal, current.signal]))
        assertServerStateScopeCurrent(current)
        return data
      } catch (error) {
        assertServerStateScopeCurrent(current, error)
        throw error
      }
    },
    enabled: computed(() => scope.value !== undefined && toValue(enabled)),
  } as UseQueryOptions<TQueryData, HttpError, TSelected>
  return useQuery<TQueryData, HttpError, TSelected>(options)
}
