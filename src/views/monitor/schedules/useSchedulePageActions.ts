import { ElMessage } from 'element-plus'
import { onBeforeUnmount, watch, type Ref } from 'vue'
import type { JobScheduleRecord } from '@/api/modules/monitor'
import { createIdempotencyKey, shouldReuseIdempotencyKey } from '@/shared/http/idempotency'
import {
  assertServerStateScopeCurrent,
  invalidateServerStateResource,
  isServerStateScopeCurrent,
  useServerStateScope,
} from '@/shared/query/client'
import {
  beginServerStatePageOperation,
  propagateServerStatePageOperationError,
  type ServerStatePageOperation,
} from '@/shared/query/pageOperationScope'
import { confirmServerStatePageOperation } from '@/shared/query/scopedConfirmation'
import type { ServerStateScope } from '@/shared/query/scope'
import { confirmAction } from '@/utils/confirmAction'
import {
  MONITOR_JOBS_RESOURCE,
  MONITOR_JOB_STATS_RESOURCE,
  MONITOR_SCHEDULE_DETAIL_RESOURCE,
  MONITOR_SCHEDULE_EXECUTIONS_RESOURCE,
  MONITOR_SCHEDULES_RESOURCE,
} from '../queryResources'
import { isUpdatePayload, type ScheduleSavePayload } from './scheduleManagementSupport'
import { useScheduleMutations } from './useScheduleMutations'

type Translate = (key: string, values?: Record<string, unknown>) => string

interface SchedulePageActionOptions {
  editingSchedule: Ref<JobScheduleRecord | undefined>
  formVisible: Ref<boolean>
  pageActive: Ref<boolean>
  pageGeneration: Ref<number>
  refetchSchedules: () => Promise<unknown>
  t: Translate
}

/** 定时任务写操作的会话、页面与幂等键所有权。 */
export function useSchedulePageActions(options: SchedulePageActionOptions) {
  const mutations = useScheduleMutations()
  const pendingRunKeys = new Map<string, string>()

  function owns(generation: number, requiresForm = false): () => boolean {
    return () =>
      options.pageActive.value &&
      options.pageGeneration.value === generation &&
      (!requiresForm || options.formVisible.value)
  }

  function retryKey(scope: ServerStateScope, scheduleId: string): string {
    return `${scope.tenantId}\0${scope.subjectId}\0${scope.sessionEpoch}\0${scheduleId}`
  }

  function clearRetryKeys(): void {
    pendingRunKeys.clear()
  }

  watch(useServerStateScope(), clearRetryKeys, { flush: 'sync' })
  onBeforeUnmount(clearRetryKeys)

  async function refreshState(
    operation: ServerStatePageOperation,
    ownsOperation: () => boolean,
  ): Promise<void> {
    operation.assertCurrent(ownsOperation)
    await Promise.all(
      [
        MONITOR_SCHEDULES_RESOURCE,
        MONITOR_SCHEDULE_DETAIL_RESOURCE,
        MONITOR_SCHEDULE_EXECUTIONS_RESOURCE,
        MONITOR_JOBS_RESOURCE,
        MONITOR_JOB_STATS_RESOURCE,
      ].map((resource) => invalidateServerStateResource(operation.scope, resource)),
    )
    operation.assertCurrent(ownsOperation)
    await options.refetchSchedules()
    operation.assertCurrent(ownsOperation)
  }

  async function saveSchedule(
    payload: ScheduleSavePayload,
    expectedScope: ServerStateScope,
  ): Promise<void> {
    if (mutations.formSaving.value) return
    assertServerStateScopeCurrent(expectedScope)
    const schedule = options.editingSchedule.value
    const generation = options.pageGeneration.value
    const ownsOperation = owns(generation, true)
    let operation = beginServerStatePageOperation()

    if (isUpdatePayload(payload) && schedule && payload.enabled !== schedule.enabled) {
      const confirmedOperation = await confirmServerStatePageOperation(
        () =>
          confirmAction(
            payload.enabled
              ? options.t('monitor.schedules.enableConfirm', { name: schedule.name })
              : options.t('monitor.schedules.disableConfirm', { name: schedule.name }),
            options.t('monitor.schedules.statusConfirmTitle'),
            { type: 'warning' },
          ),
        ownsOperation,
      )
      if (!confirmedOperation || mutations.formSaving.value) return
      operation = confirmedOperation
    }

    operation.assertCurrent(ownsOperation)
    try {
      if (isUpdatePayload(payload)) {
        if (!schedule) return
        await mutations.updateMutation.mutateAsync({
          id: schedule.id,
          data: payload,
          scope: expectedScope,
        })
      } else {
        await mutations.createMutation.mutateAsync({ data: payload, scope: expectedScope })
      }
    } catch (error) {
      propagateServerStatePageOperationError(error, operation, ownsOperation)
    }
    await refreshState(operation, ownsOperation)
    operation.apply(() => {
      options.formVisible.value = false
      ElMessage.success(
        options.t(
          isUpdatePayload(payload)
            ? 'monitor.schedules.updateSuccess'
            : 'monitor.schedules.createSuccess',
        ),
      )
    }, ownsOperation)
  }

  async function handleStatus(row: JobScheduleRecord, enabled: boolean): Promise<void> {
    if (mutations.statusMutation.pending.value || mutations.hasPendingWrite.value) return
    const generation = options.pageGeneration.value
    const ownsOperation = owns(generation)
    const operation = await confirmServerStatePageOperation(
      () =>
        confirmAction(
          enabled
            ? options.t('monitor.schedules.enableConfirm', { name: row.name })
            : options.t('monitor.schedules.disableConfirm', { name: row.name }),
          options.t('monitor.schedules.statusConfirmTitle'),
          { type: 'warning' },
        ),
      ownsOperation,
    )
    if (!operation || mutations.hasPendingWrite.value) return
    operation.assertCurrent(ownsOperation)
    try {
      await mutations.statusMutation.mutateAsync({ row, enabled, scope: operation.scope })
    } catch (error) {
      propagateServerStatePageOperationError(error, operation, ownsOperation)
    }
    await refreshState(operation, ownsOperation)
    operation.apply(
      () =>
        ElMessage.success(
          options.t(
            enabled ? 'monitor.schedules.enableSuccess' : 'monitor.schedules.disableSuccess',
          ),
        ),
      ownsOperation,
    )
  }

  async function handleRun(row: JobScheduleRecord): Promise<void> {
    if (mutations.runMutation.pending.value || mutations.hasPendingWrite.value) return
    const generation = options.pageGeneration.value
    const ownsOperation = owns(generation)
    const operation = await confirmServerStatePageOperation(
      () =>
        confirmAction(
          options.t('monitor.schedules.runConfirm', { name: row.name }),
          options.t('monitor.schedules.runConfirmTitle'),
          { type: 'warning' },
        ),
      ownsOperation,
    )
    if (!operation || mutations.hasPendingWrite.value) return
    const mapKey = retryKey(operation.scope, row.id)
    const idempotencyKey = pendingRunKeys.get(mapKey) ?? createIdempotencyKey('schedule')
    try {
      operation.assertCurrent(ownsOperation)
      await mutations.runMutation.mutateAsync({ row, idempotencyKey, scope: operation.scope })
      pendingRunKeys.delete(mapKey)
    } catch (error) {
      if (isServerStateScopeCurrent(operation.scope)) {
        if (shouldReuseIdempotencyKey(error)) pendingRunKeys.set(mapKey, idempotencyKey)
        else pendingRunKeys.delete(mapKey)
      }
      propagateServerStatePageOperationError(error, operation, ownsOperation)
    }
    await refreshState(operation, ownsOperation)
    operation.apply(
      () => ElMessage.success(options.t('monitor.schedules.runSuccess')),
      ownsOperation,
    )
  }

  async function handleRemove(row: JobScheduleRecord): Promise<void> {
    if (mutations.removeMutation.pending.value || mutations.hasPendingWrite.value) return
    const generation = options.pageGeneration.value
    const ownsOperation = owns(generation)
    const operation = await confirmServerStatePageOperation(
      () =>
        confirmAction(
          options.t('monitor.schedules.deleteConfirm', { name: row.name }),
          options.t('monitor.schedules.deleteConfirmTitle'),
          { type: 'warning' },
        ),
      ownsOperation,
    )
    if (!operation || mutations.hasPendingWrite.value) return
    operation.assertCurrent(ownsOperation)
    try {
      await mutations.removeMutation.mutateAsync({ row, scope: operation.scope })
    } catch (error) {
      propagateServerStatePageOperationError(error, operation, ownsOperation)
    }
    await refreshState(operation, ownsOperation)
    operation.apply(
      () => ElMessage.success(options.t('monitor.schedules.deleteSuccess')),
      ownsOperation,
    )
  }

  return {
    ...mutations,
    clearRetryKeys,
    handleRemove,
    handleRun,
    handleStatus,
    saveSchedule,
  }
}
