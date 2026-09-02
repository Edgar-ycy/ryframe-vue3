import type { AuthSession } from '@/api/modules/auth'
import { formatLocalizedDate, translate } from '@/i18n'
import { getServerStateScope, serverStateQueryKey } from '@/shared/query/client'
import { sameServerStateScope, type ServerStateScope } from '@/shared/query/scope'
import { useUserStore } from '@/stores/user'

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

export function authSessionQueryKey(scope: ServerStateScope) {
  return serverStateQueryKey(scope, 'profile-auth-sessions', {
    scope: 'self',
    userId: scope.subjectId,
  })
}

export function currentAuthSessionScope(): ServerStateScope | undefined {
  const user = useUserStore()
  if (user.sessionStatus !== 'authenticated' || !user.tenantId || !user.userId) return undefined
  const active = getServerStateScope()
  if (!active || active.tenantId !== user.tenantId || active.subjectId !== String(user.userId)) {
    return undefined
  }
  return {
    tenantId: active.tenantId,
    subjectId: active.subjectId,
    sessionEpoch: active.sessionEpoch,
  }
}

export function sameAuthSessionScope(
  left: ServerStateScope | undefined,
  right: ServerStateScope | undefined,
): boolean {
  return sameServerStateScope(left, right)
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
