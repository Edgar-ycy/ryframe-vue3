import type {
  ServiceAccessAudit,
  ServiceAccount,
  ServiceCredential,
  ServiceDelegation,
} from '@/api/modules/serviceAccount'

export type ServiceResourceTagType = 'success' | 'warning' | 'danger' | 'info'

/** 与后端唯一超级管理员角色稳定代码保持一致；服务端仍执行最终拒绝。 */
export const SUPER_ADMIN_ROLE_CODE = 'admin'

export function serviceAccountStatusType(
  status: ServiceAccount['status'],
): ServiceResourceTagType {
  return status === '1' ? 'success' : status === '0' ? 'info' : 'warning'
}

export function serviceAccountEnabled(account: ServiceAccount): boolean {
  return account.status === '1'
}

export type ServiceCredentialEffectiveStatus = 'active' | 'expired' | 'revoked'

export function serviceCredentialEffectiveStatus(
  credential: ServiceCredential,
  now = Date.now(),
): ServiceCredentialEffectiveStatus {
  if (credential.revoked_at != null || credential.status === 'revoked') return 'revoked'
  return Date.parse(credential.expires_at) <= now ? 'expired' : 'active'
}

export function serviceCredentialStatusType(
  credential: ServiceCredential,
  now = Date.now(),
): ServiceResourceTagType {
  switch (serviceCredentialEffectiveStatus(credential, now)) {
    case 'active':
      return 'success'
    case 'expired':
      return 'warning'
    case 'revoked':
      return 'danger'
    default:
      return 'info'
  }
}

export type ServiceDelegationEffectiveStatus = 'active' | 'pending' | 'expired' | 'revoked'

export function serviceDelegationEffectiveStatus(
  delegation: ServiceDelegation,
  now = Date.now(),
): ServiceDelegationEffectiveStatus {
  if (delegation.revoked_at != null || delegation.status === 'revoked') return 'revoked'
  if (Date.parse(delegation.expires_at) <= now) return 'expired'
  return Date.parse(delegation.not_before) > now ? 'pending' : 'active'
}

export function serviceDelegationStatusType(
  delegation: ServiceDelegation,
  now = Date.now(),
): ServiceResourceTagType {
  switch (serviceDelegationEffectiveStatus(delegation, now)) {
    case 'active':
      return 'success'
    case 'pending':
      return 'warning'
    case 'expired':
    case 'revoked':
      return 'info'
    default:
      return 'info'
  }
}

export function serviceAuditResultType(
  result: ServiceAccessAudit['result'],
): ServiceResourceTagType {
  switch (result) {
    case 'success':
      return 'success'
    case 'denied':
      return 'warning'
    case 'error':
      return 'danger'
    default:
      return 'info'
  }
}

export function canRevokeCredential(credential: ServiceCredential): boolean {
  return serviceCredentialEffectiveStatus(credential) === 'active'
}

export function canRevokeDelegation(delegation: ServiceDelegation): boolean {
  const status = serviceDelegationEffectiveStatus(delegation)
  return status === 'active' || status === 'pending'
}
