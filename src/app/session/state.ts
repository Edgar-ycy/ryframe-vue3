import type { Router } from 'vue-router'
import type { UserInfo } from '@/api/modules/auth'
import { translate } from '@/i18n'
import { HttpError } from '@/shared/http/client'
import { useUserStore } from '@/stores/user'

export interface SessionRuntime {
  router: Router
  ensureAccessibleRoutes(options?: { skipAuthRefresh?: boolean }): Promise<unknown>
  resetDynamicRoutes(): void
}

let runtime: SessionRuntime | undefined
let sessionEpoch = 0
let sessionTerminating = false

export function setSessionRuntime(next: SessionRuntime): void {
  runtime = next
}

export function getSessionRuntime(): SessionRuntime | undefined {
  return runtime
}

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
export function applyAuthenticatedSession(accessToken: string, userInfo: UserInfo): boolean {
  const userStore = useUserStore()
  const scopeChanged = hasAuthenticatedScopeChanged(userStore, userInfo)
  userStore.token = accessToken
  userStore.sessionStatus = 'authenticated'
  userStore.applyUserInfo(userInfo)
  return scopeChanged
}

export async function ensureRoutesAfterAuthentication(
  skipAuthRefresh = false,
): Promise<void> {
  await runtime?.ensureAccessibleRoutes({ skipAuthRefresh })
}

function hasAuthenticatedScopeChanged(
  userStore: ReturnType<typeof useUserStore>,
  userInfo: UserInfo,
): boolean {
  if (userStore.sessionStatus !== 'authenticated' || userStore.userId === '') return false
  return String(userStore.userId) !== String(userInfo.id)
    || userStore.tenantId !== userInfo.tenant_id
    || accessFingerprint(userStore.roles) !== accessFingerprint(userInfo.roles ?? [])
    || accessFingerprint(userStore.permissions) !== accessFingerprint(userInfo.perms ?? [])
}

function accessFingerprint(values: string[]): string {
  return [...values].sort().join('\u0000')
}
