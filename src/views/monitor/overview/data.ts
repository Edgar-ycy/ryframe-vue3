import {
  getMonitorOverview,
  getMonitorOverviewTrends,
  type MonitorOverview,
  type MonitorOverviewTrends,
  type OverviewRange,
} from '@/api/modules/monitor'
import { requireOperationData } from '@/shared/http/client'
import {
  assertServerStateScopeCurrent,
  getServerStateScope,
  queryClient,
  serverStateQueryKey,
  serverStateResourcePrefix,
} from '@/shared/query/client'
import { MONITOR_OVERVIEW_RESOURCE, MONITOR_OVERVIEW_TRENDS_RESOURCE } from '../queryResources'

/** 通过租户级 Vue Query 缓存读取运维快照。 */
export async function fetchOverviewSnapshot(force = false): Promise<MonitorOverview> {
  const scope = requireOverviewScope()
  const queryKey = serverStateQueryKey(scope, MONITOR_OVERVIEW_RESOURCE, { scope: 'snapshot' })
  if (force) await queryClient.invalidateQueries({ queryKey, exact: true, refetchType: 'none' })
  const result = await queryClient.fetchQuery({
    queryKey,
    queryFn: async ({ signal }) =>
      requireOperationData(await getMonitorOverview(AbortSignal.any([signal, scope.signal]))),
    staleTime: force ? 0 : 30_000,
  })
  assertServerStateScopeCurrent(scope)
  return result
}

/** 通过租户和范围组成的缓存键读取已补零趋势。 */
export async function fetchOverviewTrends(
  range: OverviewRange,
  force = false,
): Promise<MonitorOverviewTrends> {
  const scope = requireOverviewScope()
  const queryKey = serverStateQueryKey(scope, MONITOR_OVERVIEW_TRENDS_RESOURCE, { range })
  if (force) await queryClient.invalidateQueries({ queryKey, exact: true, refetchType: 'none' })
  const result = await queryClient.fetchQuery({
    queryKey,
    queryFn: async ({ signal }) =>
      requireOperationData(
        await getMonitorOverviewTrends(range, AbortSignal.any([signal, scope.signal])),
      ),
    staleTime: force ? 0 : 5 * 60_000,
  })
  assertServerStateScopeCurrent(scope)
  return result
}

export function cancelOverviewRequests(): Promise<void> {
  const scope = getServerStateScope()
  if (!scope) return Promise.resolve()
  return Promise.all([
    queryClient.cancelQueries({
      queryKey: serverStateResourcePrefix(scope, MONITOR_OVERVIEW_RESOURCE),
    }),
    queryClient.cancelQueries({
      queryKey: serverStateResourcePrefix(scope, MONITOR_OVERVIEW_TRENDS_RESOURCE),
    }),
  ]).then(() => undefined)
}

export function cancelOverviewTrendRequests(): Promise<void> {
  const scope = getServerStateScope()
  if (!scope) return Promise.resolve()
  return queryClient.cancelQueries({
    queryKey: serverStateResourcePrefix(scope, MONITOR_OVERVIEW_TRENDS_RESOURCE),
  })
}

function requireOverviewScope() {
  const scope = getServerStateScope()
  if (!scope) throw new Error('运维概览查询缺少已认证会话范围')
  return scope
}
