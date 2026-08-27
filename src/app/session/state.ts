import type { SessionContext } from '@/api/modules/sessionContext'
import { getRouteRuntime } from '@/app/navigation/runtime'
import {
  applyTenantSessionContext,
  failClosedTenantContext,
} from '@/app/tenant-context/coordinator'
import { translate } from '@/i18n'
import { HttpError } from '@/shared/http/client'
import { deactivateServerStateScope, getServerStateSessionEpoch } from '@/shared/query/client'
import { useUserStore } from '@/stores/user'

let sessionTerminating = false

export function getSessionEpoch(): number {
  return getServerStateSessionEpoch()
}

export function invalidateSessionEpoch(): void {
  deactivateServerStateScope()
}

export function isSessionTerminating(): boolean {
  return sessionTerminating
}

export function setSessionTerminating(value: boolean): void {
  sessionTerminating = value
}

export function assertSessionEpoch(expected: number): void {
  if (expected !== getSessionEpoch() || sessionTerminating) {
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
export function applyAuthenticatedSession(
  accessToken: string,
  context: SessionContext,
  options: { forceNewServerStateScope?: boolean } = {},
): boolean {
  const userStore = useUserStore()
  try {
    return applyTenantSessionContext(context, {
      applyCredentialProjection: () => {
        userStore.token = accessToken
        userStore.sessionStatus = 'authenticated'
      },
      forceNewServerStateScope: options.forceNewServerStateScope,
    })
  } catch (error) {
    failClosedTenantContext()
    userStore.resetState()
    throw error
  }
}

export async function ensureRoutesAfterAuthentication(skipAuthRefresh = false): Promise<void> {
  await getRouteRuntime()?.ensureAccessibleRoutes({ skipAuthRefresh })
}
