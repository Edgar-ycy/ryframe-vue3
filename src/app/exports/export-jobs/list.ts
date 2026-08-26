import { computed, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { listExportJobs, type ExportJob } from '@/api/modules/exportJob'
import { HttpError, requireOperationData } from '@/shared/http/client'
import { useUserStore } from '@/stores/user'
import { exportJobListQueryKey } from '../exportJobCache'
import { shouldEnableExportJobs } from './identity'

export function useExportJobList(enabled: MaybeRefOrGetter<boolean> = true) {
  const user = useUserStore()
  const listQuery = useQuery<ExportJob[], HttpError>({
    queryKey: computed(() =>
      exportJobListQueryKey(user.tenantId || 'anonymous', String(user.userId || 'anonymous')),
    ),
    enabled: computed(() => shouldEnableExportJobs(enabled)),
    queryFn: async ({ signal }) => requireOperationData(await listExportJobs(signal)),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 10 * 60_000,
    refetchInterval: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    meta: { errorMode: 'silent' },
  })

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
