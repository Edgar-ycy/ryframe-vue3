import {
  createSchedule,
  getSchedule,
  listScheduleTargets,
  listSchedules,
  removeSchedule,
  runSchedule,
  updateSchedule,
  updateScheduleStatus,
  type CreateScheduleBody,
  type JobScheduleRecord,
  type ScheduleQuery,
  type ScheduleTargetRecord,
  type UpdateScheduleBody,
} from '@/api/modules/monitor'
import { requireOperationData } from '@/shared/http/client'
import type { PageResponse } from '@/shared/http/types'
import { invalidateTenantResource, queryClient, tenantQueryKey } from '@/shared/query/client'
import { useTenantMutation } from '@/shared/query/useTenantMutation'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
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

type Translate = (key: string, values?: Record<string, unknown>) => string
type ScheduleSavePayload = CreateScheduleBody | UpdateScheduleBody

const BUILT_IN_TARGET_LABELS: Record<string, string> = {
  'system.export_result_cleanup': 'monitor.schedules.targetExportResultCleanup',
  'system.message_retention_cleanup': 'monitor.schedules.targetMessageRetentionCleanup',
}

function emptyPage(params: ScheduleQuery): PageResponse<JobScheduleRecord> {
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

function isUpdatePayload(payload: ScheduleSavePayload): payload is UpdateScheduleBody {
  return 'version' in payload
}

function createIdempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID()
  return `schedule-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

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
  const activeQueryParams = ref<ScheduleQuery>({ ...queryParams.value })
  const formVisible = ref(false)
  const historyVisible = ref(false)
  const editingSchedule = ref<JobScheduleRecord>()
  const historySchedule = ref<JobScheduleRecord>()
  const editingId = ref<string>()

  const schedulesQuery = useTenantQuery<PageResponse<JobScheduleRecord>>(
    () => userStore.tenantId,
    () => userStore.sessionStatus === 'authenticated' && pageActive.value,
    MONITOR_SCHEDULES_RESOURCE,
    () => ({ scope: 'list', filters: { ...activeQueryParams.value } }),
    async signal => {
      const response = await listSchedules({ ...activeQueryParams.value }, signal)
      return response.data ?? emptyPage(activeQueryParams.value)
    },
  )
  const targetsQuery = useTenantQuery<ScheduleTargetRecord[]>(
    () => userStore.tenantId,
    () => userStore.sessionStatus === 'authenticated',
    MONITOR_SCHEDULE_TARGETS_RESOURCE,
    () => ({ scope: 'catalog' }),
    async signal => {
      const response = await listScheduleTargets(signal)
      return response.data ?? []
    },
    { refetchInterval: false },
  )

  const createMutation = useTenantMutation<unknown, CreateScheduleBody>(
    () => userStore.tenantId,
    MONITOR_SCHEDULES_RESOURCE,
    {
      mutationFn: payload => createSchedule(payload),
      onSuccess: () => ElMessage.success(t('monitor.schedules.createSuccess')),
    },
  )
  const updateMutation = useTenantMutation<unknown, { id: string, data: UpdateScheduleBody }>(
    () => userStore.tenantId,
    MONITOR_SCHEDULES_RESOURCE,
    {
      mutationFn: ({ id, data }) => updateSchedule(id, data),
      onSuccess: () => ElMessage.success(t('monitor.schedules.updateSuccess')),
    },
  )
  const statusMutation = useTenantMutation<unknown, { row: JobScheduleRecord, enabled: boolean }>(
    () => userStore.tenantId,
    MONITOR_SCHEDULES_RESOURCE,
    {
      mutationFn: ({ row, enabled }) => updateScheduleStatus(row.id, { enabled, version: row.version }),
      onSuccess: (_data, variables) => {
        ElMessage.success(variables.enabled ? t('monitor.schedules.enableSuccess') : t('monitor.schedules.disableSuccess'))
      },
    },
  )
  const removeMutation = useTenantMutation<unknown, JobScheduleRecord>(
    () => userStore.tenantId,
    MONITOR_SCHEDULES_RESOURCE,
    {
      mutationFn: row => removeSchedule(row.id, { version: row.version }),
      onSuccess: () => ElMessage.success(t('monitor.schedules.deleteSuccess')),
    },
  )
  const runMutation = useTenantMutation<unknown, JobScheduleRecord>(
    () => userStore.tenantId,
    MONITOR_SCHEDULES_RESOURCE,
    {
      mutationFn: row => runSchedule(row.id, createIdempotencyKey()),
      onSuccess: () => ElMessage.success(t('monitor.schedules.runSuccess')),
    },
  )

  const loading = computed(() => schedulesQuery.isFetching.value)
  const targetLoading = computed(() => targetsQuery.isFetching.value)
  const tableData = computed(() => schedulesQuery.data.value?.items ?? [])
  const total = computed(() => schedulesQuery.data.value?.total ?? 0)
  const targets = computed(() => targetsQuery.data.value ?? [])
  const availableTargets = computed(() => targets.value.filter(target => target.available))
  const targetsLoaded = computed(() => targetsQuery.isSuccess.value)
  const formSaving = computed(() => createMutation.pending.value || updateMutation.pending.value)
  const statusPendingId = computed(() => (
    statusMutation.pending.value ? statusMutation.variables.value?.row.id ?? undefined : undefined
  ))
  const removePendingId = computed(() => (
    removeMutation.pending.value ? removeMutation.variables.value?.id ?? undefined : undefined
  ))
  const runPendingId = computed(() => (
    runMutation.pending.value ? runMutation.variables.value?.id ?? undefined : undefined
  ))
  const hasPendingWrite = computed(() => (
    formSaving.value
    || statusMutation.pending.value
    || removeMutation.pending.value
    || runMutation.pending.value
  ))
  const errorMessage = computed(() => (
    schedulesQuery.error.value?.message ?? targetsQuery.error.value?.message ?? ''
  ))

  async function refresh(): Promise<void> {
    await Promise.all([
      schedulesQuery.refetch({ throwOnError: true }),
      targetsQuery.refetch({ throwOnError: true }),
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
    const nextParams = { ...queryParams.value }
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
    if (!availableTargets.value.length) return
    editingSchedule.value = undefined
    formVisible.value = true
  }

  async function openEdit(row: JobScheduleRecord): Promise<void> {
    if (editingId.value || hasPendingWrite.value) return
    editingId.value = row.id
    try {
      const detail = await queryClient.fetchQuery<JobScheduleRecord>({
        queryKey: tenantQueryKey(userStore.tenantId, MONITOR_SCHEDULE_DETAIL_RESOURCE, { id: row.id }),
        queryFn: async ({ signal }) => requireOperationData(await getSchedule(row.id, signal)),
        staleTime: 0,
      })
      editingSchedule.value = detail
      formVisible.value = true
    }
    finally {
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
      const scheduleId = editingSchedule.value?.id
      if (!scheduleId) return
      await updateMutation.mutateAsync({ id: scheduleId, data: payload })
    }
    else {
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
    const confirmed = await confirmAction(message, t('monitor.schedules.statusConfirmTitle'), { type: 'warning' })
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
    await runMutation.mutateAsync(row)
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
    const tenantId = userStore.tenantId
    if (!tenantId) return
    await Promise.all([
      invalidateTenantResource(tenantId, MONITOR_SCHEDULES_RESOURCE),
      invalidateTenantResource(tenantId, MONITOR_SCHEDULE_DETAIL_RESOURCE),
      invalidateTenantResource(tenantId, MONITOR_SCHEDULE_EXECUTIONS_RESOURCE),
      invalidateTenantResource(tenantId, MONITOR_JOBS_RESOURCE),
      invalidateTenantResource(tenantId, MONITOR_JOB_STATS_RESOURCE),
    ])
  }

  function targetName(handlerKey: string): string {
    const labelKey = BUILT_IN_TARGET_LABELS[handlerKey]
    if (labelKey) return t(labelKey)
    return targets.value.find(target => target.handler_key === handlerKey)?.display_name ?? handlerKey
  }

  return {
    availableTargets,
    editingId,
    editingSchedule,
    errorMessage,
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
    tableData,
    targetLoading,
    targetsLoaded,
    targetName,
    targets,
    total,
  }
}
