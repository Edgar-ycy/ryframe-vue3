import type { UserManageableStatus, UserStatus } from '@/api/modules/user'
import { translate } from '@/i18n'

const USER_STATUS_KEYS: Record<UserStatus, string> = {
  0: 'system.common.disabled',
  1: 'system.common.normal',
  pending_activation: 'system.user.pendingActivation',
}

export function isManageableStatus(status: UserStatus): status is UserManageableStatus {
  return status === '0' || status === '1'
}

export function userStatusLabel(status: UserStatus): string {
  return translate(USER_STATUS_KEYS[status])
}

export function userStatusTag(status: UserStatus): 'danger' | 'success' | 'warning' {
  if (status === '1') return 'success'
  if (status === '0') return 'danger'
  return 'warning'
}
