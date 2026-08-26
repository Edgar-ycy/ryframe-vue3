import {
  createSchedule,
  removeSchedule,
  runSchedule,
  updateSchedule,
  updateScheduleStatus,
  type CreateScheduleBody,
  type JobScheduleRecord,
  type UpdateScheduleBody,
} from '@/api/modules/monitor'
import { useTenantMutation } from '@/shared/query/useTenantMutation'
import { MONITOR_SCHEDULES_RESOURCE } from '../queryResources'
import type { RunSchedulePayload } from './scheduleManagementSupport'

type Translate = (key: string, values?: Record<string, unknown>) => string

/** 集中管理定时任务写操作及其互斥状态。 */
export function useScheduleMutations(tenantId: () => string, t: Translate) {
  const createMutation = useTenantMutation<unknown, CreateScheduleBody>(
    tenantId,
    MONITOR_SCHEDULES_RESOURCE,
    {
      mutationFn: (payload) => createSchedule(payload),
      onSuccess: () => ElMessage.success(t('monitor.schedules.createSuccess')),
    },
  )
  const updateMutation = useTenantMutation<unknown, { id: string; data: UpdateScheduleBody }>(
    tenantId,
    MONITOR_SCHEDULES_RESOURCE,
    {
      mutationFn: ({ id, data }) => updateSchedule(id, data),
      onSuccess: () => ElMessage.success(t('monitor.schedules.updateSuccess')),
    },
  )
  const statusMutation = useTenantMutation<unknown, { row: JobScheduleRecord; enabled: boolean }>(
    tenantId,
    MONITOR_SCHEDULES_RESOURCE,
    {
      mutationFn: ({ row, enabled }) =>
        updateScheduleStatus(row.id, { enabled, version: row.version }),
      onSuccess: (_data, variables) => {
        ElMessage.success(
          variables.enabled
            ? t('monitor.schedules.enableSuccess')
            : t('monitor.schedules.disableSuccess'),
        )
      },
    },
  )
  const removeMutation = useTenantMutation<unknown, JobScheduleRecord>(
    tenantId,
    MONITOR_SCHEDULES_RESOURCE,
    {
      mutationFn: (row) => removeSchedule(row.id, { version: row.version }),
      onSuccess: () => ElMessage.success(t('monitor.schedules.deleteSuccess')),
    },
  )
  const runMutation = useTenantMutation<unknown, RunSchedulePayload>(
    tenantId,
    MONITOR_SCHEDULES_RESOURCE,
    {
      mutationFn: ({ row, idempotencyKey }) => runSchedule(row.id, idempotencyKey),
      onSuccess: () => ElMessage.success(t('monitor.schedules.runSuccess')),
    },
  )

  const formSaving = computed(() => createMutation.pending.value || updateMutation.pending.value)
  const statusPendingId = computed(() =>
    statusMutation.pending.value
      ? (statusMutation.variables.value?.row.id ?? undefined)
      : undefined,
  )
  const removePendingId = computed(() =>
    removeMutation.pending.value ? (removeMutation.variables.value?.id ?? undefined) : undefined,
  )
  const runPendingId = computed(() =>
    runMutation.pending.value ? (runMutation.variables.value?.row.id ?? undefined) : undefined,
  )
  const hasPendingWrite = computed(
    () =>
      formSaving.value ||
      statusMutation.pending.value ||
      removeMutation.pending.value ||
      runMutation.pending.value,
  )

  return {
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
  }
}
