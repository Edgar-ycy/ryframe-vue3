import {
  get_platform_tenants_by_tenant_id,
  get_platform_tenants_by_tenant_id_usage,
  get_platform_tenants_page,
  post_platform_tenants,
  put_platform_tenants_by_tenant_id,
  put_platform_tenants_by_tenant_id_status,
} from '@/api/generated/operations/platform'
import type { OperationData, OperationJsonBody, OperationQuery } from '@/api/contract'

export type TenantStatus = 'enabled' | 'disabled'
export type Tenant = OperationData<'post_platform_tenants'>
export type TenantCapacityQuery = OperationQuery<'get_platform_tenants_page'>
export type TenantCapacityPage = OperationData<'get_platform_tenants_page'>
export type TenantCapacity = OperationData<'get_platform_tenants_by_tenant_id'>
export type TenantUsage = OperationData<'get_platform_tenants_by_tenant_id_usage'>
export type TenantQuotaUsage = TenantUsage['users']
export type TenantRequestWindowUsage = TenantUsage['request_window']
export type TenantCapacityStatus = NonNullable<TenantCapacityQuery['capacity_status']>
export type TenantExpirationStatus = NonNullable<TenantCapacityQuery['expiration_status']>
export type TenantPublicStatus = NonNullable<TenantCapacityQuery['status']>
/** 新租户必须在创建事务中确定已发布套餐版本与数据目标。 */
export type CreateTenantPayload = OperationJsonBody<'post_platform_tenants'> & {
  plan_version_id: string
  data_target_key: string
}
export type UpdateTenantPayload = OperationJsonBody<'put_platform_tenants_by_tenant_id'>

export function listTenantCapacities(query: TenantCapacityQuery, signal?: AbortSignal) {
  return get_platform_tenants_page({
    params: query,
    signal,
  })
}

export function getTenantCapacity(tenantId: string, signal?: AbortSignal) {
  return get_platform_tenants_by_tenant_id({
    path: { tenant_id: tenantId },
    signal,
  })
}

export function getTenantUsage(tenantId: string, signal?: AbortSignal) {
  return get_platform_tenants_by_tenant_id_usage({
    path: { tenant_id: tenantId },
    signal,
  })
}

export function createTenant(data: CreateTenantPayload, idempotencyKey: string) {
  return post_platform_tenants({
    data,
    headers: { 'Idempotency-Key': idempotencyKey },
  })
}

export function updateTenant(tenantId: string, data: UpdateTenantPayload) {
  return put_platform_tenants_by_tenant_id({
    path: { tenant_id: tenantId },
    data,
  })
}

export function updateTenantStatus(tenantId: string, status: TenantStatus) {
  return put_platform_tenants_by_tenant_id_status({
    path: { tenant_id: tenantId },
    data: { status },
  })
}
