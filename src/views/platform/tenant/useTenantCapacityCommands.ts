import { computed } from 'vue'
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
import { invalidateTenantResource } from '@/shared/query/client'
import { useTenantMutation } from '@/shared/query/useTenantMutation'
import {
  LEGACY_TENANTS_RESOURCE,
  TENANT_CAPACITY_DETAIL_RESOURCE,
  TENANT_CAPACITY_PAGE_RESOURCE,
  TENANT_USAGE_RESOURCE,
} from './queryResources'
import { createTenantIntentFingerprint } from './tenantCapacityFilters'
import { useTenantCapacityQueries } from './useTenantCapacityQueries'

type SaveTenantCommand =
  | { kind: 'create'; data: CreateTenantPayload, idempotencyKey: string }
  | { kind: 'update'; tenantId: string; data: UpdateTenantPayload }

type TenantStatusCommand = { tenantId: string; status: TenantStatus }

/** 平台租户容量页的新增、更新、状态变更与缓存协调。 */
export function useTenantCapacityCommands(
  queries: ReturnType<typeof useTenantCapacityQueries>,
) {
  let pendingCreateIdempotencyKey: string | undefined
  let pendingCreateIntentFingerprint: string | undefined
  const saveMutation = useTenantMutation<Tenant, SaveTenantCommand>(
    () => queries.userStore.tenantId,
    TENANT_CAPACITY_PAGE_RESOURCE,
    {
      meta: { errorMode: 'silent' },
      mutationFn: async command => requireOperationData(await (
        command.kind === 'create'
          ? createTenant(command.data, command.idempotencyKey)
          : updateTenant(command.tenantId, command.data)
      )),
    },
  )
  const statusMutation = useTenantMutation<void, TenantStatusCommand>(
    () => queries.userStore.tenantId,
    TENANT_CAPACITY_PAGE_RESOURCE,
    {
      meta: { errorMode: 'silent' },
      mutationFn: async command => {
        await updateTenantStatus(command.tenantId, command.status)
      },
    },
  )

  const togglingTenantId = computed(() => (
    statusMutation.pending.value
      ? statusMutation.variables.value?.tenantId ?? null
      : null
  ))

  async function reconcileTenant(affectedTenantId?: string): Promise<void> {
    const systemTenantId = queries.userStore.tenantId
    if (!systemTenantId) return
    await Promise.all([
      invalidateTenantResource(systemTenantId, TENANT_CAPACITY_PAGE_RESOURCE),
      invalidateTenantResource(systemTenantId, TENANT_CAPACITY_DETAIL_RESOURCE),
      invalidateTenantResource(systemTenantId, TENANT_USAGE_RESOURCE),
      invalidateTenantResource(systemTenantId, LEGACY_TENANTS_RESOURCE),
    ])
    if (queries.queryEnabled.value) {
      await queries.tenantPageQuery.refetch({ throwOnError: true })
      if (affectedTenantId && queries.selectedTenantId.value === affectedTenantId) {
        await queries.detailQuery.refetch({ throwOnError: true })
      }
    }
  }

  async function createTenantRecord(data: CreateTenantPayload): Promise<Tenant> {
    const intentFingerprint = createTenantIntentFingerprint(data)
    const idempotencyKey = pendingCreateIntentFingerprint === intentFingerprint
      ? pendingCreateIdempotencyKey ?? createIdempotencyKey('tenant-provision')
      : createIdempotencyKey('tenant-provision')
    try {
      const tenant = await saveMutation.mutateAsync({
        kind: 'create',
        data,
        idempotencyKey,
      })
      pendingCreateIdempotencyKey = undefined
      pendingCreateIntentFingerprint = undefined
      await reconcileTenant(tenant.tenant_id)
      return tenant
    }
    catch (error) {
      // 网络中断或 5xx 时服务端事务可能已经提交；同一用户意图必须复用原键。
      // 若用户随后修改请求，服务端会以 409 拒绝不同载荷，下一次提交再生成新键。
      pendingCreateIdempotencyKey = shouldReuseIdempotencyKey(error)
        ? idempotencyKey
        : undefined
      pendingCreateIntentFingerprint = pendingCreateIdempotencyKey
        ? intentFingerprint
        : undefined
      throw error
    }
  }

  async function updateTenantRecord(
    tenantId: string,
    data: UpdateTenantPayload,
  ): Promise<Tenant> {
    const tenant = await saveMutation.mutateAsync({ kind: 'update', tenantId, data })
    await reconcileTenant(tenantId)
    return tenant
  }

  async function toggleTenantStatus(tenantId: string, status: TenantStatus): Promise<void> {
    await statusMutation.mutateAsync({ tenantId, status })
    await reconcileTenant(tenantId)
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
