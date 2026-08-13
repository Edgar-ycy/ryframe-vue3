import type {
  TenantCapacityStatus,
  TenantExpirationStatus,
  TenantPublicStatus,
  TenantQuotaUsage,
  TenantRequestWindowUsage,
} from '@/api/modules/tenant'

export type CapacityStatusTagType = 'success' | 'warning' | 'danger' | 'info'

export const TENANT_CAPACITY_STATUSES = [
  'normal',
  'warning',
  'critical',
  'exceeded',
  'unlimited',
  'unknown',
] as const satisfies readonly TenantCapacityStatus[]

export const TENANT_EXPIRATION_STATUSES = [
  'active',
  'expiring',
  'expired',
  'never',
] as const satisfies readonly TenantExpirationStatus[]

export const TENANT_PUBLIC_STATUSES = [
  'enabled',
  'disabled',
] as const satisfies readonly TenantPublicStatus[]

export function capacityStatusType(
  status: TenantCapacityStatus | string | null | undefined,
): CapacityStatusTagType {
  switch (status) {
    case 'normal':
      return 'success'
    case 'warning':
      return 'warning'
    case 'critical':
    case 'exceeded':
      return 'danger'
    default:
      return 'info'
  }
}

type PercentageUsage = TenantQuotaUsage | TenantRequestWindowUsage

/** Element Plus 进度条只接收 0 到 100，超额部分由旁边的数字文本完整呈现。 */
export function quotaPercentage(usage: PercentageUsage | null | undefined): number {
  return Math.min(100, Math.max(0, quotaDisplayPercentage(usage)))
}

/** 将后端基点换算为百分比；10000 基点等于 100%。 */
export function quotaDisplayPercentage(
  usage: PercentageUsage | null | undefined,
): number {
  const basisPoints = usage?.percentage_basis_points
  return basisPoints == null || !Number.isFinite(basisPoints)
    ? 0
    : Math.max(0, basisPoints / 100)
}

export function storageUsedMiB(usedBytes: number): number {
  return Math.max(0, usedBytes) / (1024 * 1024)
}
