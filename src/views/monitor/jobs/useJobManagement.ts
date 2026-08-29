import { ElMessage } from 'element-plus'
import { computed, onBeforeUnmount, onDeactivated, ref, watch } from 'vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import {
  getBackgroundJobStats,
  listBackgroundJobs,
  retryBackgroundJob,
  type BackgroundJobQuery,
  type BackgroundJobRecord,
  type BackgroundJobStats,
} from '@/api/modules/monitor'
import { useKeepAlivePageActive } from '@/hooks/useKeepAlivePageActive'
import { emptyPageResponse, type PageResponse } from '@/shared/http/types'
import {
  assertServerStateScopeCurrent,
  invalidateServerStateResource,
  useServerStateScope,
} from '@/shared/query/client'
import { confirmServerStatePageOperation } from '@/shared/query/scopedConfirmation'
import { propagateServerStatePageOperationError } from '@/shared/query/pageOperationScope'
import type { ServerStateScope } from '@/shared/query/scope'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'
import { useUserStore } from '@/stores/user'
import { confirmAction } from '@/utils/confirmAction'
import { MONITOR_JOBS_RESOURCE, MONITOR_JOB_STATS_RESOURCE } from '../queryResources'

type Translate = (key: string, values?: Record<string, unknown>) => string
type RouteQuerySource = Pick<RouteLocationNormalizedLoaded, 'query'>
type RetryJobCommand = { row: BackgroundJobRecord; scope: ServerStateScope }

const EMPTY_STATS: BackgroundJobStats = {
  total: 0,
  ready: 0,
  pending: 0,
  running: 0,
  succeeded: 0,
  dead: 0,
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
  route: RouteQuerySource,
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
  const pageGeneration = ref(0)

  const jobsQuery = useServerStateQuery<PageResponse<BackgroundJobRecord>>(
    () => userStore.sessionStatus === 'authenticated' && pageActive.value,
    MONITOR_JOBS_RESOURCE,
    () => ({ scope: 'list', filters: normalizeQueryParams(activeQueryParams.value) }),
    async (signal) => {
      const params = normalizeQueryParams(activeQueryParams.value)
      const response = await listBackgroundJobs(params, signal)
      return response.data ?? emptyPageResponse<BackgroundJobRecord>(params)
    },
    { meta: { errorMode: 'silent' } },
  )
  const statsQuery = useServerStateQuery<BackgroundJobStats>(
    () => userStore.sessionStatus === 'authenticated' && pageActive.value,
    MONITOR_JOB_STATS_RESOURCE,
    () => ({ scope: 'summary' }),
    async (signal) => {
      const response = await getBackgroundJobStats(signal)
      return response.data ?? EMPTY_STATS
    },
    { meta: { errorMode: 'silent' } },
  )
  const retryMutation = useServerStateMutation<unknown, RetryJobCommand>(MONITOR_JOBS_RESOURCE, {
    invalidateOnSuccess: false,
    meta: { errorMode: 'silent' },
    mutationFn: (command) => {
      assertServerStateScopeCurrent(command.scope)
      return retryBackgroundJob(command.row.id)
    },
  })

  const loading = jobsQuery.isFetching
  const statsLoading = statsQuery.isFetching
  const jobs = jobsQuery.data
  const jobsError = jobsQuery.error
  const stats = statsQuery.data
  const statsError = statsQuery.error
  const retryPending = retryMutation.pending
  const retryingId = computed(() =>
    retryMutation.pending.value ? (retryMutation.variables.value?.row.id ?? undefined) : undefined,
  )

  async function refresh(): Promise<void> {
    await Promise.all([
      jobsQuery.refetch({ throwOnError: true }),
      statsQuery.refetch({ throwOnError: true }),
    ])
  }

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

  function syncFromRoute(nextRoute: RouteQuerySource): void {
    const nextScheduleId = parseScheduleId(nextRoute.query.schedule_id)
    if (nextScheduleId === queryParams.value.schedule_id) return
    queryParams.value = {
      ...queryParams.value,
      page: 1,
      schedule_id: nextScheduleId,
    }
    activeQueryParams.value = normalizeQueryParams(queryParams.value)
  }

  async function refreshActivePage(): Promise<void> {
    syncFromRoute(route)
    await refresh()
  }

  useKeepAlivePageActive(pageActive, refreshActivePage)

  function invalidatePageState(): void {
    pageGeneration.value += 1
    selectedError.value = undefined
    errorDialogVisible.value = false
  }

  watch(useServerStateScope(), invalidatePageState, { flush: 'sync' })
  onDeactivated(invalidatePageState)
  onBeforeUnmount(invalidatePageState)

  function showError(row: BackgroundJobRecord): void {
    selectedError.value = row
    errorDialogVisible.value = true
  }

  async function handleRetry(row: BackgroundJobRecord): Promise<void> {
    if (row.status !== 'dead' || retryMutation.pending.value) return
    const generation = pageGeneration.value
    const ownsOperation = () => pageActive.value && pageGeneration.value === generation
    const operation = await confirmServerStatePageOperation(
      () =>
        confirmAction(
          t('monitor.jobs.retryConfirm', { id: row.id }),
          t('monitor.jobs.retryConfirmTitle'),
          { type: 'warning' },
        ),
      ownsOperation,
    )
    if (!operation || retryMutation.pending.value) return

    operation.assertCurrent(ownsOperation)
    try {
      await retryMutation.mutateAsync({ row, scope: operation.scope })
    } catch (error) {
      propagateServerStatePageOperationError(error, operation, ownsOperation)
    }
    operation.apply(() => ElMessage.success(t('monitor.jobs.retrySuccess')), ownsOperation)
    operation.assertCurrent(ownsOperation)
    await Promise.all([
      invalidateServerStateResource(operation.scope, MONITOR_JOBS_RESOURCE),
      invalidateServerStateResource(operation.scope, MONITOR_JOB_STATS_RESOURCE),
    ])
    operation.assertCurrent(ownsOperation)
    await refresh()
    operation.assertCurrent(ownsOperation)
  }

  return {
    errorDialogVisible,
    fetchData,
    handleReset,
    handleRetry,
    handleSearch,
    jobs,
    jobsError,
    loading,
    queryParams,
    refresh,
    retryPending,
    retryingId,
    selectedError,
    showError,
    stats,
    statsError,
    statsLoading,
    syncFromRoute,
  }
}
