import type { TagProps } from 'element-plus'
import type { TenantQuotaUsage, TenantRequestWindowUsage } from '@/api/modules/tenant'

export function capacityTagType(status: string): TagProps['type'] {
  if (status === 'exceeded' || status === 'critical') return 'danger'
  if (status === 'warning') return 'warning'
  if (status === 'normal') return 'success'
  return 'info'
}

export function expirationTagType(status: string): TagProps['type'] {
  if (status === 'expired') return 'danger'
  if (status === 'expiring') return 'warning'
  if (status === 'active') return 'success'
  return 'info'
}

export function tenantStatusTagType(status: string): TagProps['type'] {
  if (status === 'enabled') return 'success'
  if (status === 'disabled' || status === 'provisioning_failed') return 'danger'
  return 'warning'
}

export function capacityLabelKey(status: string): string {
  const suffixes: Record<string, string> = {
    normal: 'Normal',
    warning: 'Warning',
    critical: 'Critical',
    exceeded: 'Exceeded',
    unlimited: 'Unlimited',
    unknown: 'Unknown',
  }
  return `tenantCapacity.capacity${suffixes[status] ?? 'Unknown'}`
}

export function expirationLabelKey(status: string): string {
  const suffixes: Record<string, string> = {
    active: 'Active',
    expiring: 'Expiring',
    expired: 'Expired',
    never: 'Never',
  }
  return `tenantCapacity.expiration${suffixes[status] ?? 'Active'}`
}

export function tenantStatusLabelKey(status: string): string {
  const labels: Record<string, string> = {
    enabled: 'statusEnabled',
    disabled: 'statusDisabled',
    provisioning: 'statusProvisioning',
    provisioning_failed: 'statusProvisioningFailed',
  }
  return `tenantCapacity.${labels[status] ?? 'statusUnknown'}`
}

export function isMutableTenantStatus(status: string): boolean {
  return status === 'enabled' || status === 'disabled'
}

export function requestWindowQuota(request: TenantRequestWindowUsage): TenantQuotaUsage {
  return {
    used: request.current ?? 0,
    limit: request.limit,
    percentage_basis_points: request.percentage_basis_points,
    status: request.status,
  }
}

export function formatQuotaLimit(value: number, locale: string, unlimited: string): string {
  if (value === 0) return unlimited
  return new Intl.NumberFormat(locale).format(value)
}

export function formatStorageLimit(value: number, locale: string, unlimited: string): string {
  if (value === 0) return unlimited
  return `${new Intl.NumberFormat(locale).format(value)} MiB`
}
