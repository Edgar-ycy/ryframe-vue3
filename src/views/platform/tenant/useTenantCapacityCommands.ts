import { computed, onBeforeUnmount, watch } from 'vue'
import {
  createTenant,
  updateTenant,
  updateTenantStatus,
  type CreateTenantPayload,
  type Tenant,
  type TenantStatus,
  type UpdateTenantPayload,
} from '@/api/modules/tenant'
import { requireOperationData } from '@/shared/http/client'
import { createIdempotencyKey, shouldReuseIdempotencyKey } from '@/shared/http/idempotency'
import {
  assertServerStateScopeCurrent,
  invalidateServerStateResource,
  isServerStateScopeCurrent,
  useServerStateScope,
} from '@/shared/query/client'
import type { ServerStateScope } from '@/shared/query/scope'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'
import {
  TENANT_CAPACITY_DETAIL_RESOURCE,
  TENANT_CAPACITY_PAGE_RESOURCE,
  TENANT_USAGE_RESOURCE,
} from './queryResources'
import { createTenantIntentFingerprint } from './tenantCapacityFilters'
import { useTenantCapacityQueries } from './useTenantCapacityQueries'

type SaveTenantCommand =
  | { kind: 'create'; data: CreateTenantPayload; idempotencyKey: string; scope: ServerStateScope }
  | { kind: 'update'; tenantId: string; data: UpdateTenantPayload; scope: ServerStateScope }

type TenantStatusCommand = { tenantId: string; status: TenantStatus; scope: ServerStateScope }
type AssertPageCurrent = () => void

/** 平台租户容量页的新增、更新、状态变更与缓存协调。 */
export function useTenantCapacityCommands(queries: ReturnType<typeof useTenantCapacityQueries>) {
  let pendingCreateIdempotencyKey: string | undefined
  let pendingCreateIntentFingerprint: string | undefined
  const saveMutation = useServerStateMutation<Tenant, SaveTenantCommand>(
    TENANT_CAPACITY_PAGE_RESOURCE,
    {
      invalidateOnSuccess: false,
      meta: { errorMode: 'silent' },
      mutationFn: async (command) => {
        assertServerStateScopeCurrent(command.scope)
        return requireOperationData(
          await (command.kind === 'create'
            ? createTenant(command.data, command.idempotencyKey)
            : updateTenant(command.tenantId, command.data)),
        )
      },
    },
  )
  const statusMutation = useServerStateMutation<void, TenantStatusCommand>(
    TENANT_CAPACITY_PAGE_RESOURCE,
    {
      invalidateOnSuccess: false,
      meta: { errorMode: 'silent' },
      mutationFn: async (command) => {
        assertServerStateScopeCurrent(command.scope)
        await updateTenantStatus(command.tenantId, command.status)
      },
    },
  )

  const togglingTenantId = computed(() =>
    statusMutation.pending.value ? (statusMutation.variables.value?.tenantId ?? null) : null,
  )

  function clearCreateRetry(): void {
    pendingCreateIdempotencyKey = undefined
    pendingCreateIntentFingerprint = undefined
  }

  watch(useServerStateScope(), clearCreateRetry, { flush: 'sync' })
  onBeforeUnmount(clearCreateRetry)

  async function reconcileTenant(
    scope: ServerStateScope,
    affectedTenantId?: string,
    assertPageCurrent: AssertPageCurrent = () => undefined,
  ): Promise<void> {
    assertPageCurrent()
    assertServerStateScopeCurrent(scope)
    await Promise.all([
      invalidateServerStateResource(scope, TENANT_CAPACITY_PAGE_RESOURCE),
      invalidateServerStateResource(scope, TENANT_CAPACITY_DETAIL_RESOURCE),
      invalidateServerStateResource(scope, TENANT_USAGE_RESOURCE),
    ])
    assertServerStateScopeCurrent(scope)
    assertPageCurrent()
    if (queries.queryEnabled.value) {
      await queries.tenantPageQuery.refetch({ throwOnError: true })
      if (affectedTenantId && queries.selectedTenantId.value === affectedTenantId) {
        await queries.detailQuery.refetch({ throwOnError: true })
      }
    }
    assertServerStateScopeCurrent(scope)
    assertPageCurrent()
  }

  async function createTenantRecord(
    data: CreateTenantPayload,
    scope: ServerStateScope,
    assertPageCurrent: AssertPageCurrent = () => undefined,
  ): Promise<Tenant> {
    assertPageCurrent()
    assertServerStateScopeCurrent(scope)
    const intentFingerprint = createTenantIntentFingerprint(data)
    const idempotencyKey =
      pendingCreateIntentFingerprint === intentFingerprint
        ? (pendingCreateIdempotencyKey ?? createIdempotencyKey('tenant-provision'))
        : createIdempotencyKey('tenant-provision')
    let tenant: Tenant
    try {
      tenant = await saveMutation.mutateAsync({
        kind: 'create',
        data,
        idempotencyKey,
        scope,
      })
    } catch (error) {
      // 网络中断或 5xx 时服务端事务可能已经提交；同一用户意图必须复用原键。
      // 若用户随后修改请求，服务端会以 409 拒绝不同载荷，下一次提交再生成新键。
      if (isServerStateScopeCurrent(scope)) {
        pendingCreateIdempotencyKey = shouldReuseIdempotencyKey(error) ? idempotencyKey : undefined
        pendingCreateIntentFingerprint = pendingCreateIdempotencyKey ? intentFingerprint : undefined
      }
      throw error
    }
    assertServerStateScopeCurrent(scope)
    assertPageCurrent()
    clearCreateRetry()
    await reconcileTenant(scope, tenant.tenant_id, assertPageCurrent).catch(() => undefined)
    return tenant
  }

  async function updateTenantRecord(
    tenantId: string,
    data: UpdateTenantPayload,
    scope: ServerStateScope,
    assertPageCurrent: AssertPageCurrent = () => undefined,
  ): Promise<Tenant> {
    assertPageCurrent()
    assertServerStateScopeCurrent(scope)
    const tenant = await saveMutation.mutateAsync({ kind: 'update', tenantId, data, scope })
    assertServerStateScopeCurrent(scope)
    assertPageCurrent()
    await reconcileTenant(scope, tenantId, assertPageCurrent).catch(() => undefined)
    return tenant
  }

  async function toggleTenantStatus(
    tenantId: string,
    status: TenantStatus,
    scope: ServerStateScope,
    assertPageCurrent: AssertPageCurrent = () => undefined,
  ): Promise<void> {
    assertPageCurrent()
    assertServerStateScopeCurrent(scope)
    await statusMutation.mutateAsync({ tenantId, status, scope })
    assertServerStateScopeCurrent(scope)
    assertPageCurrent()
    await reconcileTenant(scope, tenantId, assertPageCurrent).catch(() => undefined)
  }

  return {
    createTenantRecord,
    savePending: saveMutation.pending,
    statusPending: statusMutation.pending,
    toggleTenantStatus,
    togglingTenantId,
    updateTenantRecord,
  }
}
