import type { AuthSession } from '@/api/modules/auth'
import { formatLocalizedDate, translate } from '@/i18n'
import { serverStateQueryKeyForIdentity } from '@/shared/query/client'
import { useUserStore } from '@/stores/user'

export interface SessionIdentity {
  tenantId: string
  userId: string
}

/** 仅供个人中心展示使用，字段全部由生成的会话契约派生。 */
export interface AuthSessionView {
  key: AuthSession['sid']
  current: AuthSession['current']
  device: string
  browser: string
  operatingSystem: string
  ipAddress: AuthSession['ipaddr']
  loginLocation: string
  loginTime: string
  lastActivity: string
  expiresAt: string
}

export function authSessionQueryKey(identity: SessionIdentity) {
  return serverStateQueryKeyForIdentity(
    identity.tenantId,
    identity.userId,
    'profile-auth-sessions',
    {
      scope: 'self',
      userId: identity.userId,
    },
  )
}

export function currentAuthSessionIdentity(): SessionIdentity | undefined {
  const user = useUserStore()
  if (user.sessionStatus !== 'authenticated' || !user.tenantId || !user.userId) return undefined
  return { tenantId: user.tenantId, userId: String(user.userId) }
}

export function sameAuthSessionIdentity(
  left: SessionIdentity | undefined,
  right: SessionIdentity | undefined,
): boolean {
  return left?.tenantId === right?.tenantId && left?.userId === right?.userId
}

export function authSessionView(session: AuthSession): AuthSessionView {
  const browser = session.browser || translate('profile.sessions.unknownValue')
  const operatingSystem = session.os || translate('profile.sessions.unknownValue')
  const knownDeviceParts = [session.browser, session.os].filter(Boolean)
  return {
    key: session.sid,
    current: session.current,
    device: knownDeviceParts.join(' · ') || translate('profile.sessions.unknownDevice'),
    browser,
    operatingSystem,
    ipAddress: session.ipaddr,
    loginLocation: session.login_location || translate('profile.sessions.unknownValue'),
    loginTime: formatLocalizedDate(session.login_time),
    lastActivity: formatLocalizedDate(session.last_access_time),
    expiresAt: formatLocalizedDate(session.expires_at),
  }
}
