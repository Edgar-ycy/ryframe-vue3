import request from '@/api/request'

export interface Tenant { tenant_id: string; name: string; domain?: string | null; status: '0' | '1'; expire_at?: string | null; max_users: number; max_roles: number; max_storage_mb: number; max_requests_per_min: number }
export interface CreateTenantPayload { tenant_id: string; name: string; domain?: string; expire_at?: string; max_users?: number; max_roles?: number; max_storage_mb?: number; max_requests_per_min?: number; admin_username: string; admin_password: string }
export interface UpdateTenantPayload { name: string; domain?: string; expire_at?: string; max_users: number; max_roles: number; max_storage_mb: number; max_requests_per_min: number }
export function listTenants() { return request<Tenant[]>({ url: '/platform/tenants', method: 'get' }) }
export function createTenant(data: CreateTenantPayload) { return request<Tenant>({ url: '/platform/tenants', method: 'post', data }) }
export function updateTenant(tenantId: string, data: UpdateTenantPayload) { return request<Tenant>({ url: `/platform/tenants/${tenantId}`, method: 'put', data }) }
export function updateTenantStatus(tenantId: string, status: '0' | '1') { return request({ url: `/platform/tenants/${tenantId}/status`, method: 'put', data: { status } }) }
