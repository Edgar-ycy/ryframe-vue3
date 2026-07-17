import request from '@/shared/http/client'
import type { ApiSchema, OperationJsonBody } from '@/api/contract'

export type TenantStatus = '0' | '1'
export type Tenant = Omit<ApiSchema<'TenantVo'>, 'status'> & { status: TenantStatus }
export type CreateTenantPayload = OperationJsonBody<'post_platform_tenants'>
export type UpdateTenantPayload = OperationJsonBody<'put_platform_tenants_by_tenant_id'>

export function listTenants() { return request<Tenant[]>({ url: '/platform/tenants', method: 'get' }) }
export function createTenant(data: CreateTenantPayload) { return request<Tenant>({ url: '/platform/tenants', method: 'post', data }) }
export function updateTenant(tenantId: string, data: UpdateTenantPayload) { return request<Tenant>({ url: `/platform/tenants/${tenantId}`, method: 'put', data }) }
export function updateTenantStatus(tenantId: string, status: TenantStatus) { return request({ url: `/platform/tenants/${tenantId}/status`, method: 'put', data: { status } }) }
