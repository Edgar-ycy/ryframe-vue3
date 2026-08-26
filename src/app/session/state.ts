import type { SessionContext } from '@/api/modules/sessionContext'
import { getRouteRuntime } from '@/app/navigation/runtime'
import {
  applyTenantSessionContext,
  failClosedTenantContext,
} from '@/app/tenant-context/coordinator'
import { useTenantContextStore } from '@/app/tenant-context/store'
import { translate } from '@/i18n'
import { HttpError } from '@/shared/http/client'
import { useUserStore } from '@/stores/user'

let sessionEpoch = 0
let sessionTerminating = false

export function getSessionEpoch(): number {
  return sessionEpoch
}

export function invalidateSessionEpoch(): void {
  sessionEpoch += 1
}

export function isSessionTerminating(): boolean {
  return sessionTerminating
}

export function setSessionTerminating(value: boolean): void {
  sessionTerminating = value
}

export function assertSessionEpoch(expected: number): void {
  if (expected !== sessionEpoch || sessionTerminating) {
    throw new HttpError(translate('shell.session.operationCancelled'), {
      status: 401,
      kind: 'cancelled',
    })
  }
}

/**
 * 写入认证结果，并返回动态路由所属的身份或授权范围是否发生变化。
 * 跨标签页刷新令牌可能切换到另一个用户、租户或权限集合，调用方必须据此清理旧路由。
 */
export function applyAuthenticatedSession(accessToken: string, context: SessionContext): boolean {
  const userStore = useUserStore()
  const tenantContext = useTenantContextStore()
  const scopeChanged = hasAuthenticatedScopeChanged(userStore, tenantContext, context)
  try {
    applyTenantSessionContext(context)
    userStore.token = accessToken
    userStore.sessionStatus = 'authenticated'
    return scopeChanged
  } catch (error) {
    failClosedTenantContext()
    userStore.resetState()
    throw error
  }
}

export async function ensureRoutesAfterAuthentication(skipAuthRefresh = false): Promise<void> {
  await getRouteRuntime()?.ensureAccessibleRoutes({ skipAuthRefresh })
}

function hasAuthenticatedScopeChanged(
  userStore: ReturnType<typeof useUserStore>,
  tenantContext: ReturnType<typeof useTenantContextStore>,
  context: SessionContext,
): boolean {
  const userInfo = context.user
  if (userStore.sessionStatus !== 'authenticated' || userStore.userId === '') return false
  return (
    String(userStore.userId) !== String(userInfo.id) ||
    userStore.tenantId !== userInfo.tenant_id ||
    userStore.isSuperAdmin !== context.is_super_admin ||
    accessFingerprint(userStore.roles) !== accessFingerprint(context.roles) ||
    accessFingerprint(userStore.permissions) !== accessFingerprint(context.permissions) ||
    tenantContext.authorizationEpoch !== context.authorization_epoch ||
    tenantContext.runtimeEpoch !== context.runtime_epoch ||
    accessFingerprint(tenantContext.capabilityCodes) !==
      accessFingerprint(context.capabilities.map((item) => item.code)) ||
    JSON.stringify(tenantContext.context?.menus ?? []) !== JSON.stringify(context.menus)
  )
}

function accessFingerprint(values: readonly string[]): string {
  return [...values].sort().join('\u0000')
}
