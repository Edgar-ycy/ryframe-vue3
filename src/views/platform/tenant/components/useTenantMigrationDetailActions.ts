import { ElMessage } from 'element-plus'
import { computed, onBeforeUnmount, onDeactivated, ref, watch, type Ref } from 'vue'
import {
  cancelTenantDataMigration,
  finalizeTenantDataMigration,
  type TenantDataMigration,
} from '@/api/modules/tenantData'
import { requireOperationData } from '@/shared/http/client'
import { createIdempotencyKey, shouldReuseIdempotencyKey } from '@/shared/http/idempotency'
import {
  assertServerStateScopeCurrent,
  isServerStateScopeCurrent,
  useServerStateScope,
} from '@/shared/query/client'
import { confirmServerStatePageOperation } from '@/shared/query/scopedConfirmation'
import type { ServerStateScope } from '@/shared/query/scope'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'
import { confirmAction } from '@/utils/confirmAction'
import { invalidateTenantMigrationResources } from './tenantDataMigrationCommand'

type Translate = (key: string, values?: Record<string, unknown>) => string
type ActionKind = 'cancel' | 'finalize'
type MigrationActionCommand = {
  idempotencyKey: string
  migrationId: string
  scope: ServerStateScope
}

export function tenantMigrationActionRetryOwner(
  kind: ActionKind,
  migrationId: string,
  scope: ServerStateScope,
): string {
  return `${scope.tenantId}\0${scope.subjectId}\0${scope.sessionEpoch}\0${migrationId}\0${kind}`
}

interface TenantMigrationDetailActionsOptions {
  active: () => boolean
  canCancel: () => boolean
  canFinalize: () => boolean
  emitUpdated: (migration: TenantDataMigration, scope: ServerStateScope) => void
  migration: Ref<TenantDataMigration | undefined>
  refresh: () => Promise<void>
  t: Translate
  visible: Ref<boolean>
}

/** 迁移取消与完成命令的确认、幂等键及页面副作用所有权。 */
export function useTenantMigrationDetailActions(options: TenantMigrationDetailActionsOptions) {
  const pageGeneration = ref(0)
  const pendingKeys = new Map<string, string>()

  function execute(kind: ActionKind, command: MigrationActionCommand) {
    assertServerStateScopeCurrent(command.scope)
    return kind === 'cancel'
      ? cancelTenantDataMigration(command.migrationId, command.idempotencyKey)
      : finalizeTenantDataMigration(command.migrationId, command.idempotencyKey)
  }

  const cancelMutation = useServerStateMutation<TenantDataMigration, MigrationActionCommand>(
    'platform-tenant-data-migrations',
    {
      invalidateOnSuccess: false,
      meta: { errorMode: 'silent' },
      mutationFn: async (command) => requireOperationData(await execute('cancel', command)),
    },
  )
  const finalizeMutation = useServerStateMutation<TenantDataMigration, MigrationActionCommand>(
    'platform-tenant-data-migrations',
    {
      invalidateOnSuccess: false,
      meta: { errorMode: 'silent' },
      mutationFn: async (command) => requireOperationData(await execute('finalize', command)),
    },
  )
  const actionPending = computed(
    () => cancelMutation.pending.value || finalizeMutation.pending.value,
  )
  const actionError = computed(() => cancelMutation.error.value ?? finalizeMutation.error.value)

  function invalidate(clearRetry: boolean): void {
    pageGeneration.value += 1
    if (clearRetry) pendingKeys.clear()
    options.visible.value = false
  }

  watch(useServerStateScope(), () => invalidate(true), { flush: 'sync' })
  watch(options.active, (active) => !active && invalidate(false), { flush: 'sync' })
  watch(options.visible, (visible, previous) => !visible && previous && invalidate(false), {
    flush: 'sync',
  })
  onDeactivated(() => invalidate(false))
  onBeforeUnmount(() => invalidate(true))

  function handleOpen(): void {
    cancelMutation.reset()
    finalizeMutation.reset()
    void options.refresh()
  }

  function confirmation(kind: ActionKind, migration: TenantDataMigration): Promise<boolean> {
    return confirmAction(
      options.t(`tenantData.${kind}Confirm`, { id: migration.id }),
      options.t(`tenantData.${kind}ConfirmTitle`),
      { type: 'warning' },
    )
  }

  async function run(kind: ActionKind): Promise<void> {
    const migration = options.migration.value
    const allowed = kind === 'cancel' ? options.canCancel() : options.canFinalize()
    if (!migration || !allowed || actionPending.value) return
    const generation = pageGeneration.value
    const ownsOperation = () =>
      options.active() &&
      options.visible.value &&
      pageGeneration.value === generation &&
      options.migration.value?.id === migration.id
    const operation = await confirmServerStatePageOperation(
      () => confirmation(kind, migration),
      ownsOperation,
    )
    if (!operation || actionPending.value) return
    const owner = tenantMigrationActionRetryOwner(kind, migration.id, operation.scope)
    const key = pendingKeys.get(owner) ?? createIdempotencyKey(`tenant-data-migration-${kind}`)
    const mutation = kind === 'cancel' ? cancelMutation : finalizeMutation
    let updated: TenantDataMigration
    try {
      operation.assertCurrent(ownsOperation)
      updated = await mutation.mutateAsync({
        idempotencyKey: key,
        migrationId: migration.id,
        scope: operation.scope,
      })
      pendingKeys.delete(owner)
    } catch (error) {
      if (isServerStateScopeCurrent(operation.scope)) {
        if (shouldReuseIdempotencyKey(error)) pendingKeys.set(owner, key)
        else pendingKeys.delete(owner)
      }
      return
    }
    if (!operation.isCurrent(ownsOperation)) return
    await invalidateTenantMigrationResources(operation.scope)
    operation.assertCurrent(ownsOperation)
    operation.apply(() => options.emitUpdated(updated, operation.scope), ownsOperation)
    operation.assertCurrent(ownsOperation)
    await options.refresh()
    operation.assertCurrent(ownsOperation)
    operation.apply(
      () =>
        ElMessage.success(
          options.t(
            kind === 'cancel'
              ? 'tenantData.cancellationRequested'
              : 'tenantData.finalizationRequested',
          ),
        ),
      ownsOperation,
    )
  }

  return {
    actionError,
    actionPending,
    cancelMutation,
    finalizeMutation,
    handleCancel: () => run('cancel'),
    handleFinalize: () => run('finalize'),
    handleOpen,
  }
}
