import type {
  CreateTenantPayload,
  TenantCapacityQuery,
  TenantCapacityStatus,
  TenantExpirationStatus,
  TenantPublicStatus,
} from '@/api/modules/tenant'

export interface TenantCapacityFilterState {
  tenant_id: string
  name: string
  status: TenantPublicStatus | ''
  expiration_status: TenantExpirationStatus | ''
  capacity_status: TenantCapacityStatus | ''
}

export const TENANT_CAPACITY_DEFAULT_PAGE_SIZE = 20
export const TENANT_CAPACITY_MAX_PAGE_SIZE = 100

export function emptyTenantCapacityFilters(): TenantCapacityFilterState {
  return {
    tenant_id: '',
    name: '',
    status: '',
    expiration_status: '',
    capacity_status: '',
  }
}

export function normalizeTenantCapacityFilters(
  filters: TenantCapacityFilterState,
): TenantCapacityFilterState {
  return {
    tenant_id: filters.tenant_id.trim(),
    name: filters.name.trim(),
    status: filters.status,
    expiration_status: filters.expiration_status,
    capacity_status: filters.capacity_status,
  }
}

export function sameTenantCapacityFilters(
  left: TenantCapacityFilterState,
  right: TenantCapacityFilterState,
): boolean {
  return (
    left.tenant_id === right.tenant_id &&
    left.name === right.name &&
    left.status === right.status &&
    left.expiration_status === right.expiration_status &&
    left.capacity_status === right.capacity_status
  )
}

export function normalizePositiveInteger(
  value: number,
  fallback: number,
  maximum?: number,
): number {
  if (!Number.isFinite(value)) return fallback
  const normalized = Math.max(1, Math.trunc(value))
  return maximum === undefined ? normalized : Math.min(maximum, normalized)
}

export function buildTenantCapacityPageQuery(
  filters: TenantCapacityFilterState,
  page: number,
  pageSize: number,
  includeUsage: boolean,
): TenantCapacityQuery {
  return {
    page,
    page_size: pageSize,
    tenant_id: filters.tenant_id || undefined,
    name: filters.name || undefined,
    status: filters.status || undefined,
    expiration_status: filters.expiration_status || undefined,
    capacity_status: includeUsage ? filters.capacity_status || undefined : undefined,
  }
}

export function createTenantIntentFingerprint(data: CreateTenantPayload): string {
  // 密码不写入持久存储，也不生成可离线猜测的快速摘要。若只有密码变化，复用旧键
  // 会由服务端 Argon2 快照安全地返回 409，随后下一次提交生成新意图键。
  return JSON.stringify({
    tenant_id: data.tenant_id,
    name: data.name,
    domain: data.domain ?? null,
    expire_at: data.expire_at ?? null,
    max_users: data.max_users ?? null,
    max_roles: data.max_roles ?? null,
    max_storage_mb: data.max_storage_mb ?? null,
    max_requests_per_min: data.max_requests_per_min ?? null,
    admin_username: data.admin_username,
    plan_version_id: data.plan_version_id,
    data_target_key: data.data_target_key,
  })
}
