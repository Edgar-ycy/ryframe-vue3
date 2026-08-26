import { describe, expect, it } from 'vitest'
import {
  capacityLabelKey,
  capacityTagType,
  expirationLabelKey,
  formatQuotaLimit,
  formatStorageLimit,
  isMutableTenantStatus,
  requestWindowQuota,
  tenantStatusLabelKey,
  tenantStatusTagType,
} from '@/views/platform/tenant/components/tenantUsagePresentation'

describe('租户容量展示模型', () => {
  it('保持状态标签、颜色和可编辑规则', () => {
    expect(capacityTagType('critical')).toBe('danger')
    expect(capacityLabelKey('unlimited')).toBe('tenantCapacity.capacityUnlimited')
    expect(expirationLabelKey('expired')).toBe('tenantCapacity.expirationExpired')
    expect(tenantStatusTagType('enabled')).toBe('success')
    expect(tenantStatusLabelKey('provisioning_failed')).toBe(
      'tenantCapacity.statusProvisioningFailed',
    )
    expect(isMutableTenantStatus('enabled')).toBe(true)
    expect(isMutableTenantStatus('provisioning')).toBe(false)
  })

  it('将请求窗口转换为配额并格式化限制值', () => {
    expect(
      requestWindowQuota({
        current: null,
        limit: 1000,
        percentage_basis_points: 250,
        status: 'normal',
      }),
    ).toEqual({
      used: 0,
      limit: 1000,
      percentage_basis_points: 250,
      status: 'normal',
    })
    expect(formatQuotaLimit(0, 'en-US', 'Unlimited')).toBe('Unlimited')
    expect(formatQuotaLimit(1200, 'en-US', 'Unlimited')).toBe('1,200')
    expect(formatStorageLimit(2048, 'en-US', 'Unlimited')).toBe('2,048 MiB')
  })
})
