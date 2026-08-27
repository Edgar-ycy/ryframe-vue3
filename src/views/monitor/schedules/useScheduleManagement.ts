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
import { createIdempotencyKey, shouldReuseIdempotencyKey } from '@/shared/http/idempotency'
import { emptyPageResponse, type PageResponse } from '@/shared/http/types'
import {
  assertServerStateScopeCurrent,
  getServerStateScope,
  invalidateActiveServerStateResource,
  queryClient,
  serverStateQueryKey,
} from '@/shared/query/client'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'
import { useUserStore } from '@/stores/user'
import { confirmAction } from '@/utils/confirmAction'
import {
  MONITOR_JOBS_RESOURCE,
  MONITOR_JOB_STATS_RESOURCE,
  MONITOR_SCHEDULE_DETAIL_RESOURCE,
  MONITOR_SCHEDULE_EXECUTIONS_RESOURCE,
  MONITOR_SCHEDULES_RESOURCE,
  MONITOR_SCHEDULE_TARGETS_RESOURCE,
} from '../queryResources'
import {
  BUILT_IN_TARGET_LABELS,
  isUpdatePayload,
  normalizeQueryParams,
  type ScheduleSavePayload,
} from './scheduleManagementSupport'
import { useScheduleMutations } from './useScheduleMutations'

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
  const pendingRunKeys = new Map<string, string>()

  const schedulesQuery = useServerStateQuery<PageResponse<JobScheduleRecord>>(
    () => userStore.sessionStatus === 'authenticated' && pageActive.value,
    MONITOR_SCHEDULES_RESOURCE,
    () => ({ scope: 'list', filters: normalizeQueryParams(activeQueryParams.value) }),
    async (signal) => {
      const params = normalizeQueryParams(activeQueryParams.value)
      const response = await listSchedules(params, signal)
      return response.data ?? emptyPageResponse<JobScheduleRecord>(params)
    },
  )
  const targetsQuery = useServerStateQuery<ScheduleTargetRecord[]>(
    () => userStore.sessionStatus === 'authenticated',
    MONITOR_SCHEDULE_TARGETS_RESOURCE,
    () => ({ scope: 'catalog' }),
    async (signal) => {
      const response = await listScheduleTargets(signal)
      return response.data ?? []
    },
    { refetchInterval: false },
  )

  const {
    createMutation,
    formSaving,
    hasPendingWrite,
    removeMutation,
    removePendingId,
    runMutation,
    runPendingId,
    statusMutation,
    statusPendingId,
    updateMutation,
  } = useScheduleMutations(t)

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
    editingSchedule.value = undefined
    formVisible.value = true
  }

  async function openEdit(row: JobScheduleRecord): Promise<void> {
    if (editingId.value || hasPendingWrite.value) return
    const scope = getServerStateScope()
    if (!scope) return
    editingId.value = row.id
    try {
      const detail = await queryClient.fetchQuery<JobScheduleRecord>({
        queryKey: serverStateQueryKey(scope, MONITOR_SCHEDULE_DETAIL_RESOURCE, {
          id: row.id,
        }),
        queryFn: async ({ signal }) =>
          requireOperationData(await getSchedule(row.id, AbortSignal.any([signal, scope.signal]))),
        staleTime: 0,
      })
      assertServerStateScopeCurrent(scope)
      editingSchedule.value = detail
      formVisible.value = true
    } finally {
      editingId.value = undefined
    }
  }

  function openHistory(row: JobScheduleRecord): void {
    historySchedule.value = row
    historyVisible.value = true
  }

  async function saveSchedule(payload: ScheduleSavePayload): Promise<void> {
    if (formSaving.value) return
    if (isUpdatePayload(payload)) {
      const schedule = editingSchedule.value
      if (!schedule) return
      if (payload.enabled !== schedule.enabled) {
        const message = payload.enabled
          ? t('monitor.schedules.enableConfirm', { name: schedule.name })
          : t('monitor.schedules.disableConfirm', { name: schedule.name })
        const confirmed = await confirmAction(message, t('monitor.schedules.statusConfirmTitle'), {
          type: 'warning',
        })
        if (!confirmed || formSaving.value) return
      }
      await updateMutation.mutateAsync({ id: schedule.id, data: payload })
    } else {
      await createMutation.mutateAsync(payload)
    }
    formVisible.value = false
    await refreshScheduleState()
  }

  async function handleStatus(row: JobScheduleRecord, enabled: boolean): Promise<void> {
    if (statusMutation.pending.value || hasPendingWrite.value) return
    const message = enabled
      ? t('monitor.schedules.enableConfirm', { name: row.name })
      : t('monitor.schedules.disableConfirm', { name: row.name })
    const confirmed = await confirmAction(message, t('monitor.schedules.statusConfirmTitle'), {
      type: 'warning',
    })
    if (!confirmed || hasPendingWrite.value) return
    await statusMutation.mutateAsync({ row, enabled })
    await refreshScheduleState()
  }

  async function handleRun(row: JobScheduleRecord): Promise<void> {
    if (runMutation.pending.value || hasPendingWrite.value) return
    const confirmed = await confirmAction(
      t('monitor.schedules.runConfirm', { name: row.name }),
      t('monitor.schedules.runConfirmTitle'),
      { type: 'warning' },
    )
    if (!confirmed || hasPendingWrite.value) return
    const idempotencyKey = pendingRunKeys.get(row.id) ?? createIdempotencyKey('schedule')
    try {
      await runMutation.mutateAsync({ row, idempotencyKey })
      pendingRunKeys.delete(row.id)
    } catch (error) {
      if (shouldReuseIdempotencyKey(error)) {
        pendingRunKeys.set(row.id, idempotencyKey)
      } else {
        pendingRunKeys.delete(row.id)
      }
      throw error
    }
    await invalidateRelatedResources()
    await schedulesQuery.refetch({ throwOnError: true })
  }

  async function handleRemove(row: JobScheduleRecord): Promise<void> {
    if (removeMutation.pending.value || hasPendingWrite.value) return
    const confirmed = await confirmAction(
      t('monitor.schedules.deleteConfirm', { name: row.name }),
      t('monitor.schedules.deleteConfirmTitle'),
      { type: 'warning' },
    )
    if (!confirmed || hasPendingWrite.value) return
    await removeMutation.mutateAsync(row)
    await refreshScheduleState()
  }

  async function refreshScheduleState(): Promise<void> {
    await invalidateRelatedResources()
    await schedulesQuery.refetch({ throwOnError: true })
  }

  async function invalidateRelatedResources(): Promise<void> {
    await Promise.all([
      invalidateActiveServerStateResource(MONITOR_SCHEDULES_RESOURCE),
      invalidateActiveServerStateResource(MONITOR_SCHEDULE_DETAIL_RESOURCE),
      invalidateActiveServerStateResource(MONITOR_SCHEDULE_EXECUTIONS_RESOURCE),
      invalidateActiveServerStateResource(MONITOR_JOBS_RESOURCE),
      invalidateActiveServerStateResource(MONITOR_JOB_STATS_RESOURCE),
    ])
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
