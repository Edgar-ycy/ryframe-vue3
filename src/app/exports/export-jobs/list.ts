import type { MaybeRefOrGetter } from 'vue'
import { listExportJobs, type ExportJob } from '@/api/modules/exportJob'
import { requireOperationData } from '@/shared/http/client'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'
import { EXPORT_JOBS_RESOURCE } from '../exportJobCache'
import { shouldEnableExportJobs } from './identity'

export function useExportJobList(enabled: MaybeRefOrGetter<boolean> = true) {
  const listQuery = useServerStateQuery<ExportJob[]>(
    () => shouldEnableExportJobs(enabled),
    EXPORT_JOBS_RESOURCE,
    () => ({ scope: 'list' }),
    async (signal) => requireOperationData(await listExportJobs(signal)),
    {
      staleTime: Number.POSITIVE_INFINITY,
      gcTime: 10 * 60_000,
      refetchInterval: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      meta: { errorMode: 'silent' },
    },
  )

  async function refresh(): Promise<void> {
    if (!shouldEnableExportJobs(enabled)) return
    await listQuery.refetch({ throwOnError: true })
  }

  return {
    listQuery,
    jobs: listQuery.data,
    loading: listQuery.isFetching,
    error: listQuery.error,
    refresh,
  }
}

/** 未读数量独立于任务列表，保持和消息中心一致的持久徽标语义。 */
