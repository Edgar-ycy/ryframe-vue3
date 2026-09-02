import { onBeforeUnmount, onDeactivated, ref, watch } from 'vue'
import {
  getSchedule,
  listScheduleTargets,
  listSchedules,
  type JobScheduleRecord,
  type ScheduleQuery,
  type ScheduleTargetRecord,
} from '@/api/modules/monitor'
import { useKeepAlivePageActive } from '@/hooks/useKeepAlivePageActive'
import { requireOperationData } from '@/shared/http/client'
import { emptyPageResponse, type PageResponse } from '@/shared/http/types'
import {
  getServerStateScope,
  queryClient,
  serverStateQueryKey,
  useServerStateScope,
} from '@/shared/query/client'
import {
  beginServerStatePageOperation,
  propagateServerStatePageOperationError,
} from '@/shared/query/pageOperationScope'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'
import { useUserStore } from '@/stores/user'
import {
  MONITOR_SCHEDULE_DETAIL_RESOURCE,
  MONITOR_SCHEDULES_RESOURCE,
  MONITOR_SCHEDULE_TARGETS_RESOURCE,
} from '../queryResources'
import { BUILT_IN_TARGET_LABELS, normalizeQueryParams } from './scheduleManagementSupport'
import { useSchedulePageActions } from './useSchedulePageActions'

type Translate = (key: string, values?: Record<string, unknown>) => string

/** 定时任务列表、目标目录和所有写操作的页面状态。 */
export function useScheduleManagement(t: Translate) {
  const userStore = useUserStore()
  const pageActive = ref(true)
  const queryParams = ref<ScheduleQuery>({
    page: 1,
    page_size: 10,
    name: '',
    handler_key: '',
    enabled: undefined,
  })
  const activeQueryParams = ref<ScheduleQuery>(normalizeQueryParams(queryParams.value))
  const formVisible = ref(false)
  const historyVisible = ref(false)
  const editingSchedule = ref<JobScheduleRecord>()
  const historySchedule = ref<JobScheduleRecord>()
  const editingId = ref<string>()
  const pageGeneration = ref(0)

  const schedulesQuery = useServerStateQuery<PageResponse<JobScheduleRecord>>(
    () => userStore.sessionStatus === 'authenticated' && pageActive.value,
    MONITOR_SCHEDULES_RESOURCE,
    () => ({ scope: 'list', filters: normalizeQueryParams(activeQueryParams.value) }),
    async (signal) => {
      const params = normalizeQueryParams(activeQueryParams.value)
      const response = await listSchedules(params, signal)
      return response.data ?? emptyPageResponse<JobScheduleRecord>(params)
    },
    { meta: { errorMode: 'silent' } },
  )
  const targetsQuery = useServerStateQuery<ScheduleTargetRecord[]>(
    () => userStore.sessionStatus === 'authenticated',
    MONITOR_SCHEDULE_TARGETS_RESOURCE,
    () => ({ scope: 'catalog' }),
    async (signal) => {
      const response = await listScheduleTargets(signal)
      return response.data ?? []
    },
    { refetchInterval: false, meta: { errorMode: 'silent' } },
  )

  const actions = useSchedulePageActions({
    editingSchedule,
    formVisible,
    pageActive,
    pageGeneration,
    refetchSchedules: () => schedulesQuery.refetch({ throwOnError: true }),
    t,
  })
  const {
    clearRetryKeys,
    formSaving,
    hasPendingWrite,
    handleRemove,
    handleRun,
    handleStatus,
    removePendingId,
    runPendingId,
    saveSchedule,
    statusPendingId,
  } = actions

  const loading = schedulesQuery.isFetching
  const targetLoading = targetsQuery.isFetching
  const schedules = schedulesQuery.data
  const schedulesError = schedulesQuery.error
  const targets = targetsQuery.data
  const targetsError = targetsQuery.error
  const targetsLoaded = targetsQuery.isSuccess
  async function refresh(): Promise<void> {
    await Promise.all([
      schedulesQuery.refetch({ throwOnError: true }),
      targetsQuery.refetch({ throwOnError: true }),
    ])
  }

  useKeepAlivePageActive(pageActive, refresh)

  function invalidatePageProjection(): void {
    pageGeneration.value += 1
    formVisible.value = false
    historyVisible.value = false
    editingSchedule.value = undefined
    historySchedule.value = undefined
    editingId.value = undefined
  }

  watch(
    useServerStateScope(),
    () => {
      clearRetryKeys()
      invalidatePageProjection()
    },
    { flush: 'sync' },
  )
  watch(formVisible, (visible, previous) => !visible && previous && (pageGeneration.value += 1), {
    flush: 'sync',
  })
  onDeactivated(invalidatePageProjection)
  onBeforeUnmount(invalidatePageProjection)

  async function fetchData(): Promise<void> {
    const nextParams = normalizeQueryParams(queryParams.value)
    if (JSON.stringify(nextParams) !== JSON.stringify(activeQueryParams.value)) {
      activeQueryParams.value = nextParams
      return
    }
    await schedulesQuery.refetch({ throwOnError: true })
  }

  function handleSearch(): void {
    queryParams.value.page = 1
    void fetchData()
  }

  function handleReset(): void {
    queryParams.value = {
      page: 1,
      page_size: queryParams.value.page_size,
      name: '',
      handler_key: '',
      enabled: undefined,
    }
    void fetchData()
  }

  function openCreate(): void {
    if (!availableTargets().length) return
    pageGeneration.value += 1
    editingSchedule.value = undefined
    formVisible.value = true
  }

  async function openEdit(row: JobScheduleRecord): Promise<void> {
    if (editingId.value || hasPendingWrite.value) return
    const scope = getServerStateScope()
    if (!scope) return
    pageGeneration.value += 1
    const generation = pageGeneration.value
    const operation = beginServerStatePageOperation()
    const ownsOperation = () => pageActive.value && pageGeneration.value === generation
    editingId.value = row.id
    try {
      const detail = await queryClient.fetchQuery<JobScheduleRecord>({
        queryKey: serverStateQueryKey(operation.scope, MONITOR_SCHEDULE_DETAIL_RESOURCE, {
          id: row.id,
        }),
        queryFn: async ({ signal }) =>
          requireOperationData(await getSchedule(row.id, AbortSignal.any([signal, scope.signal]))),
        meta: { errorMode: 'silent' },
        staleTime: 0,
      })
      operation.apply(() => {
        editingSchedule.value = detail
        formVisible.value = true
      }, ownsOperation)
    } catch (error) {
      propagateServerStatePageOperationError(error, operation, ownsOperation)
    } finally {
      if (operation.isCurrent(ownsOperation) && editingId.value === row.id) {
        editingId.value = undefined
      }
    }
  }

  function openHistory(row: JobScheduleRecord): void {
    historySchedule.value = row
    historyVisible.value = true
  }

  function targetName(handlerKey: string): string {
    const labelKey = BUILT_IN_TARGET_LABELS[handlerKey]
    if (labelKey) return t(labelKey)
    return (
      targets.value?.find((target) => target.handler_key === handlerKey)?.display_name ?? handlerKey
    )
  }

  function availableTargets(): ScheduleTargetRecord[] {
    return (targets.value ?? []).filter((target) => target.available)
  }

  return {
    availableTargets,
    editingId,
    editingSchedule,
    fetchData,
    formSaving,
    formVisible,
    handleRemove,
    handleReset,
    handleRun,
    handleSearch,
    handleStatus,
    hasPendingWrite,
    historySchedule,
    historyVisible,
    loading,
    openCreate,
    openEdit,
    openHistory,
    queryParams,
    refresh,
    removePendingId,
    runPendingId,
    saveSchedule,
    statusPendingId,
    schedules,
    schedulesError,
    targetLoading,
    targetsLoaded,
    targetName,
    targets,
    targetsError,
  }
}
