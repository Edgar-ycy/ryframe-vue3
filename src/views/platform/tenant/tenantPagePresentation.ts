import { ElMessage, type TagProps } from 'element-plus'
import { formatLocalizedDate } from '@/i18n'
import { HttpError } from '@/shared/http/client'
import { capacityStatusType } from './presentation'

type Translate = (key: string) => string

/** 租户容量页的标签、日期与显式错误提示。 */
export function tenantPagePresentation(t: Translate) {
  const statusKeys: Record<string, string> = {
    enabled: 'statusEnabled',
    disabled: 'statusDisabled',
    provisioning: 'statusProvisioning',
    provisioning_failed: 'statusProvisioningFailed',
  }
  const capacitySuffixes: Record<string, string> = {
    normal: 'Normal',
    warning: 'Warning',
    critical: 'Critical',
    exceeded: 'Exceeded',
    unlimited: 'Unlimited',
    unknown: 'Unknown',
  }
  const expirationSuffixes: Record<string, string> = {
    active: 'Active',
    expiring: 'Expiring',
    expired: 'Expired',
    never: 'Never',
  }

  return {
    capacityLabel: (status?: string | null) =>
      t(`tenantCapacity.capacity${status ? (capacitySuffixes[status] ?? 'Unknown') : 'Unknown'}`),
    capacityType: capacityStatusType,
    expirationLabel: (status: string) =>
      t(`tenantCapacity.expiration${expirationSuffixes[status] ?? 'Active'}`),
    expirationType(status: string): TagProps['type'] {
      if (status === 'expired') return 'danger'
      if (status === 'expiring') return 'warning'
      if (status === 'active') return 'success'
      return 'info'
    },
    formatDate: (value?: string | null) =>
      value ? formatLocalizedDate(value) : t('tenantCapacity.notAvailable'),
    showError(error: unknown): void {
      if (error instanceof HttpError && error.kind === 'cancelled') return
      ElMessage.error(error instanceof Error ? error.message : t('shell.http.requestFailed'))
    },
    statusLabel: (status: string) => t(`tenantCapacity.${statusKeys[status] ?? 'statusUnknown'}`),
  }
}
