import { computed } from 'vue'
import {
  createSchedule,
  removeSchedule,
  runSchedule,
  updateSchedule,
  updateScheduleStatus,
} from '@/api/modules/monitor'
import { assertServerStateScopeCurrent } from '@/shared/query/client'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'
import { MONITOR_SCHEDULES_RESOURCE } from '../queryResources'
import type {
  CreateScheduleCommand,
  RunSchedulePayload,
  ScheduleRowCommand,
  ScheduleStatusCommand,
  UpdateScheduleCommand,
} from './scheduleManagementSupport'

/** 集中管理定时任务写操作及其互斥状态。 */
export function useScheduleMutations() {
  const createMutation = useServerStateMutation<unknown, CreateScheduleCommand>(
    MONITOR_SCHEDULES_RESOURCE,
    {
      invalidateOnSuccess: false,
      meta: { errorMode: 'silent' },
      mutationFn: (command) => {
        assertServerStateScopeCurrent(command.scope)
        return createSchedule(command.data)
      },
    },
  )
  const updateMutation = useServerStateMutation<unknown, UpdateScheduleCommand>(
    MONITOR_SCHEDULES_RESOURCE,
    {
      invalidateOnSuccess: false,
      meta: { errorMode: 'silent' },
      mutationFn: (command) => {
        assertServerStateScopeCurrent(command.scope)
        return updateSchedule(command.id, command.data)
      },
    },
  )
  const statusMutation = useServerStateMutation<unknown, ScheduleStatusCommand>(
    MONITOR_SCHEDULES_RESOURCE,
    {
      invalidateOnSuccess: false,
      meta: { errorMode: 'silent' },
      mutationFn: (command) => {
        assertServerStateScopeCurrent(command.scope)
        return updateScheduleStatus(command.row.id, {
          enabled: command.enabled,
          version: command.row.version,
        })
      },
    },
  )
  const removeMutation = useServerStateMutation<unknown, ScheduleRowCommand>(
    MONITOR_SCHEDULES_RESOURCE,
    {
      invalidateOnSuccess: false,
      meta: { errorMode: 'silent' },
      mutationFn: (command) => {
        assertServerStateScopeCurrent(command.scope)
        return removeSchedule(command.row.id, { version: command.row.version })
      },
    },
  )
  const runMutation = useServerStateMutation<unknown, RunSchedulePayload>(
    MONITOR_SCHEDULES_RESOURCE,
    {
      invalidateOnSuccess: false,
      meta: { errorMode: 'silent' },
      mutationFn: (command) => {
        assertServerStateScopeCurrent(command.scope)
        return runSchedule(command.row.id, command.idempotencyKey)
      },
    },
  )

  const formSaving = computed(() => createMutation.pending.value || updateMutation.pending.value)
  const statusPendingId = computed(() =>
    statusMutation.pending.value
      ? (statusMutation.variables.value?.row.id ?? undefined)
      : undefined,
  )
  const removePendingId = computed(() =>
    removeMutation.pending.value
      ? (removeMutation.variables.value?.row.id ?? undefined)
      : undefined,
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
