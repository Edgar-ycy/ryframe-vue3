import {
  getMonitorOverview,
  getMonitorOverviewTrends,
  type MonitorOverview,
  type MonitorOverviewTrends,
  type OverviewRange,
} from '@/api/modules/monitor'
import { requireOperationData } from '@/shared/http/client'
import { queryClient, tenantQueryKey } from '@/shared/query/client'
import { MONITOR_OVERVIEW_RESOURCE, MONITOR_OVERVIEW_TRENDS_RESOURCE } from '../queryResources'

/** 通过租户级 Vue Query 缓存读取运维快照。 */
export async function fetchOverviewSnapshot(
  tenantId: string,
  force = false,
): Promise<MonitorOverview> {
  const queryKey = tenantQueryKey(tenantId, MONITOR_OVERVIEW_RESOURCE, { scope: 'snapshot' })
  if (force) await queryClient.invalidateQueries({ queryKey, exact: true, refetchType: 'none' })
  return queryClient.fetchQuery({
    queryKey,
    queryFn: async ({ signal }) => requireOperationData(await getMonitorOverview(signal)),
    staleTime: force ? 0 : 30_000,
  })
}

/** 通过租户和范围组成的缓存键读取已补零趋势。 */
export async function fetchOverviewTrends(
  tenantId: string,
  range: OverviewRange,
  force = false,
): Promise<MonitorOverviewTrends> {
  const queryKey = tenantQueryKey(tenantId, MONITOR_OVERVIEW_TRENDS_RESOURCE, { range })
  if (force) await queryClient.invalidateQueries({ queryKey, exact: true, refetchType: 'none' })
  return queryClient.fetchQuery({
    queryKey,
    queryFn: async ({ signal }) =>
      requireOperationData(await getMonitorOverviewTrends(range, signal)),
    staleTime: force ? 0 : 5 * 60_000,
  })
}

export function cancelOverviewRequests(tenantId: string): Promise<void> {
  return Promise.all([
    queryClient.cancelQueries({
      queryKey: tenantQueryKey(tenantId, MONITOR_OVERVIEW_RESOURCE).slice(0, 3),
    }),
    queryClient.cancelQueries({
      queryKey: tenantQueryKey(tenantId, MONITOR_OVERVIEW_TRENDS_RESOURCE).slice(0, 3),
    }),
  ]).then(() => undefined)
}

export function cancelOverviewTrendRequests(tenantId: string): Promise<void> {
  return queryClient.cancelQueries({
    queryKey: tenantQueryKey(tenantId, MONITOR_OVERVIEW_TRENDS_RESOURCE).slice(0, 3),
  })
}
