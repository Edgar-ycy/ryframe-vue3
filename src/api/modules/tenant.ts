import { requestOperation } from '@/api/operationRequest'
import type {
  OperationData,
  OperationJsonBody,
  OperationQuery,
} from '@/api/contract'

export type TenantStatus = '0' | '1'
export type Tenant = OperationData<'get_platform_tenants'>[number]
export type TenantCapacityQuery = OperationQuery<'get_platform_tenants_page'>
export type TenantCapacityPage = OperationData<'get_platform_tenants_page'>
export type TenantCapacity = OperationData<'get_platform_tenants_by_tenant_id'>
export type TenantUsage = OperationData<'get_platform_tenants_by_tenant_id_usage'>
export type TenantQuotaUsage = TenantUsage['users']
export type TenantRequestWindowUsage = TenantUsage['request_window']
export type TenantCapacityStatus = NonNullable<TenantCapacityQuery['capacity_status']>
export type TenantExpirationStatus = NonNullable<TenantCapacityQuery['expiration_status']>
export type TenantPublicStatus = NonNullable<TenantCapacityQuery['status']>
export type CreateTenantPayload = OperationJsonBody<'post_platform_tenants'>
export type UpdateTenantPayload = OperationJsonBody<'put_platform_tenants_by_tenant_id'>

/** 保留旧的不分页接口，供尚未迁移的轻量选择器继续使用。 */
export function listTenants(signal?: AbortSignal) {
  return requestOperation('get_platform_tenants', { signal })
}

export function listTenantCapacities(query: TenantCapacityQuery, signal?: AbortSignal) {
  return requestOperation('get_platform_tenants_page', {
    params: query,
    signal,
  })
}

export function getTenantCapacity(tenantId: string, signal?: AbortSignal) {
  return requestOperation('get_platform_tenants_by_tenant_id', {
    path: { tenant_id: tenantId },
    signal,
  })
}

export function getTenantUsage(tenantId: string, signal?: AbortSignal) {
  return requestOperation('get_platform_tenants_by_tenant_id_usage', {
    path: { tenant_id: tenantId },
    signal,
  })
}

export function createTenant(data: CreateTenantPayload) {
  return requestOperation('post_platform_tenants', { data })
}

export function updateTenant(tenantId: string, data: UpdateTenantPayload) {
  return requestOperation('put_platform_tenants_by_tenant_id', {
    path: { tenant_id: tenantId },
    data,
  })
}

export function updateTenantStatus(tenantId: string, status: TenantStatus) {
  return requestOperation('put_platform_tenants_by_tenant_id_status', {
    path: { tenant_id: tenantId },
    data: { status },
  })
}
