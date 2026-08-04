import { requestOperation } from '@/api/operationRequest'
import type { OperationData, OperationJsonBody } from '@/api/contract'

export type TenantStatus = '0' | '1'
export type Tenant = OperationData<'get_platform_tenants'>[number]
export type CreateTenantPayload = OperationJsonBody<'post_platform_tenants'>
export type UpdateTenantPayload = OperationJsonBody<'put_platform_tenants_by_tenant_id'>

export function listTenants(signal?: AbortSignal) {
  return requestOperation('get_platform_tenants', { signal })
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
