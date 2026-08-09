import type { RouteLocationNormalizedLoaded } from 'vue-router'
import {
  getBackgroundJobStats,
  listBackgroundJobs,
  retryBackgroundJob,
  type BackgroundJobQuery,
  type BackgroundJobRecord,
  type BackgroundJobStats,
} from '@/api/modules/monitor'
import type { PageResponse } from '@/shared/http/types'
import { useTenantMutation } from '@/shared/query/useTenantMutation'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useUserStore } from '@/stores/user'
import { confirmAction } from '@/utils/confirmAction'
import { MONITOR_JOBS_RESOURCE, MONITOR_JOB_STATS_RESOURCE } from '../queryResources'

type Translate = (key: string, values?: Record<string, unknown>) => string

const EMPTY_STATS: BackgroundJobStats = {
  total: 0,
  ready: 0,
  pending: 0,
  running: 0,
  succeeded: 0,
  dead: 0,
}

function emptyPage(params: BackgroundJobQuery): PageResponse<BackgroundJobRecord> {
  const pageSize = params.page_size ?? 10
  return {
    items: [],
    page: params.page ?? 1,
    page_size: pageSize,
    total: 0,
    total_pages: 0,
    max_page_size: pageSize,
  }
}

function parseScheduleId(value: unknown): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value
  return typeof candidate === 'string' && /^[1-9]\d*$/u.test(candidate) ? candidate : undefined
}

function normalizeQueryParams(params: BackgroundJobQuery): BackgroundJobQuery {
  const jobType = params.job_type?.trim()
  const scheduleId = params.schedule_id?.trim()
  return {
    ...params,
    job_type: jobType || undefined,
    status: params.status || undefined,
    schedule_id: scheduleId || undefined,
  }
}

function sameParams(left: BackgroundJobQuery, right: BackgroundJobQuery): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

/** 后台任务列表、统计和死信重投的页面状态。 */
export function useJobManagement(
  t: Translate,
  route: RouteLocationNormalizedLoaded,
  syncScheduleId: (scheduleId: string | undefined) => void,
) {
  const userStore = useUserStore()
  const pageActive = ref(true)
  const scheduleId = parseScheduleId(route.query.schedule_id)
  const queryParams = ref<BackgroundJobQuery>({
    page: 1,
    page_size: 10,
    job_type: '',
    status: '',
    schedule_id: scheduleId,
  })
  const activeQueryParams = ref<BackgroundJobQuery>(normalizeQueryParams(queryParams.value))
  const selectedError = ref<BackgroundJobRecord | undefined>()
  const errorDialogVisible = ref(false)

  const jobsQuery = useTenantQuery<PageResponse<BackgroundJobRecord>>(
    () => userStore.tenantId,
    () => userStore.sessionStatus === 'authenticated' && pageActive.value,
    MONITOR_JOBS_RESOURCE,
    () => ({ scope: 'list', filters: normalizeQueryParams(activeQueryParams.value) }),
    async signal => {
      const params = normalizeQueryParams(activeQueryParams.value)
      const response = await listBackgroundJobs(params, signal)
      return response.data ?? emptyPage(params)
    },
  )
  const statsQuery = useTenantQuery<BackgroundJobStats>(
    () => userStore.tenantId,
    () => userStore.sessionStatus === 'authenticated' && pageActive.value,
    MONITOR_JOB_STATS_RESOURCE,
    () => ({ scope: 'summary' }),
    async signal => {
      const response = await getBackgroundJobStats(signal)
      return response.data ?? EMPTY_STATS
    },
  )
  const retryMutation = useTenantMutation<unknown, BackgroundJobRecord>(
    () => userStore.tenantId,
    MONITOR_JOBS_RESOURCE,
    {
      mutationFn: row => retryBackgroundJob(row.id),
      onSuccess: () => {
        ElMessage.success(t('monitor.jobs.retrySuccess'))
      },
    },
  )

  const loading = computed(() => jobsQuery.isFetching.value)
  const statsLoading = computed(() => statsQuery.isFetching.value)
  const tableData = computed(() => jobsQuery.data.value?.items ?? [])
  const total = computed(() => jobsQuery.data.value?.total ?? 0)
  const stats = computed(() => statsQuery.data.value ?? EMPTY_STATS)
  const retryPending = retryMutation.pending
  const retryingId = computed(() => (
    retryMutation.pending.value ? retryMutation.variables.value?.id ?? undefined : undefined
  ))
  const errorMessage = computed(() => (
    jobsQuery.error.value?.message ?? statsQuery.error.value?.message ?? ''
  ))

  async function refresh(): Promise<void> {
    await Promise.all([
      jobsQuery.refetch({ throwOnError: true }),
      statsQuery.refetch({ throwOnError: true }),
    ])
  }

  onActivated(() => {
    if (pageActive.value) return
    pageActive.value = true
    void refresh()
  })

  onDeactivated(() => {
    pageActive.value = false
  })

  async function fetchData(): Promise<void> {
    const nextParams = normalizeQueryParams(queryParams.value)
    syncScheduleId(nextParams.schedule_id ?? undefined)
    if (!sameParams(nextParams, activeQueryParams.value)) {
      activeQueryParams.value = nextParams
      return
    }
    await jobsQuery.refetch({ throwOnError: true })
  }

  function handleSearch(): void {
    queryParams.value.page = 1
    void fetchData()
  }

  function handleReset(): void {
    queryParams.value = {
      page: 1,
      page_size: queryParams.value.page_size,
      job_type: '',
      status: '',
      schedule_id: undefined,
    }
    void fetchData()
  }

  function syncFromRoute(nextRoute: RouteLocationNormalizedLoaded): void {
    const nextScheduleId = parseScheduleId(nextRoute.query.schedule_id)
    if (nextScheduleId === queryParams.value.schedule_id) return
    queryParams.value = {
      ...queryParams.value,
      page: 1,
      schedule_id: nextScheduleId,
    }
    activeQueryParams.value = normalizeQueryParams(queryParams.value)
  }

  function showError(row: BackgroundJobRecord): void {
    selectedError.value = row
    errorDialogVisible.value = true
  }

  async function handleRetry(row: BackgroundJobRecord): Promise<void> {
    if (row.status !== 'dead' || retryMutation.pending.value) return
    const confirmed = await confirmAction(
      t('monitor.jobs.retryConfirm', { id: row.id }),
      t('monitor.jobs.retryConfirmTitle'),
      { type: 'warning' },
    )
    if (!confirmed || retryMutation.pending.value) return

    await retryMutation.mutateAsync(row)
    await refresh()
  }

  return {
    errorDialogVisible,
    errorMessage,
    fetchData,
    handleReset,
    handleRetry,
    handleSearch,
    loading,
    queryParams,
    refresh,
    retryPending,
    retryingId,
    selectedError,
    showError,
    stats,
    statsLoading,
    syncFromRoute,
    tableData,
    total,
  }
}
