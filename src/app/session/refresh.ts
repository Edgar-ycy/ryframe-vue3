import { refreshToken as refreshTokenApi } from '@/api/modules/auth'
import { isSessionContext } from '@/api/modules/sessionContext'
import { translate } from '@/i18n'
import { HttpError, type AccessTokenApplied } from '@/shared/http/client'
import { useUserStore } from '@/stores/user'
import { useTenantContextStore } from '@/stores/tenantContext'
import { synchronizeTenantContextUi } from '@/app/tenant-context/contextRefresh'
import {
  broadcastAuthenticated,
  broadcastRefreshFailed,
  getRemoteRefreshOperation,
  startLocalRefreshOperation,
  waitForRemoteRefresh,
} from './channel'
import { ensureCsrfToken, invalidateCsrfToken } from './csrf'
import {
  applyAuthenticatedSession,
  assertSessionEpoch,
  ensureRoutesAfterAuthentication,
  getSessionEpoch,
  isSessionTerminating,
} from './state'

let refreshPromise: Promise<string> | undefined
let locallyAppliedAccessToken: string | undefined
const accessTokenAppliedListeners = new Set<AccessTokenApplied>()

interface RefreshResult {
  token: string
  sessionEpoch: number
}

export function getPendingRefresh(): Promise<string> | undefined {
  return refreshPromise
}

export async function refreshAccessToken(
  onAccessTokenApplied?: AccessTokenApplied,
): Promise<string> {
  if (onAccessTokenApplied) accessTokenAppliedListeners.add(onAccessTokenApplied)
  try {
    if (onAccessTokenApplied && refreshPromise && locallyAppliedAccessToken) {
      onAccessTokenApplied(locallyAppliedAccessToken)
    }
    return await runAccessTokenRefresh()
  } finally {
    if (onAccessTokenApplied) accessTokenAppliedListeners.delete(onAccessTokenApplied)
  }
}

async function runAccessTokenRefresh(): Promise<string> {
  if (isSessionTerminating()) {
    throw new HttpError(translate('shell.session.terminating'), {
      status: 401,
      kind: 'cancelled',
    })
  }

  const callerEpoch = getSessionEpoch()
  const remoteOperation = getRemoteRefreshOperation()
  if (
    !refreshPromise &&
    remoteOperation?.pending &&
    remoteOperation.expiresAt > Date.now() &&
    typeof window !== 'undefined'
  ) {
    try {
      const token = await waitForRemoteRefresh(remoteOperation)
      assertSessionEpoch(callerEpoch)
      return token
    } catch (error) {
      if (callerEpoch !== getSessionEpoch()) throw error
    }
  }

  if (!refreshPromise) {
    const refreshEpoch = getSessionEpoch()
    const operation = startLocalRefreshOperation()
    locallyAppliedAccessToken = undefined
    const pending = performRefresh(refreshEpoch)
      .then((result) => {
        assertSessionEpoch(result.sessionEpoch)
        const context = useTenantContextStore().context
        if (!context) {
          throw new HttpError(translate('shell.session.refreshResponseInvalid'), {
            status: 401,
            kind: 'invalid_response',
          })
        }
        broadcastAuthenticated(operation, result.token, context)
        return result.token
      })
      .catch((error: unknown) => {
        if (refreshEpoch === getSessionEpoch()) {
          broadcastRefreshFailed(operation, error instanceof HttpError ? error.status : undefined)
        }
        throw error
      })
      .finally(() => {
        if (refreshPromise === pending) {
          refreshPromise = undefined
          locallyAppliedAccessToken = undefined
        }
      })
    refreshPromise = pending
  }
  return refreshPromise
}

async function performRefresh(refreshEpoch: number): Promise<RefreshResult> {
  const tokenBeforeRefresh = useUserStore().token
  try {
    return await requestRefresh(false, refreshEpoch)
  } catch (error) {
    assertSessionEpoch(refreshEpoch)
    if (!(error instanceof HttpError) || error.status !== 409) throw error
    const delaySeconds = Math.min(Math.max(error.retryAfterSeconds ?? 5, 0), 10)
    await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1_000))
    assertSessionEpoch(refreshEpoch)
    const tokenFromAnotherTab = useUserStore().token
    if (tokenFromAnotherTab && tokenFromAnotherTab !== tokenBeforeRefresh) {
      return { token: tokenFromAnotherTab, sessionEpoch: getSessionEpoch() }
    }
    return requestRefresh(true, refreshEpoch)
  }
}

async function requestRefresh(forceCsrf: boolean, refreshEpoch: number): Promise<RefreshResult> {
  const challenge = await ensureCsrfToken(forceCsrf)
  try {
    assertSessionEpoch(refreshEpoch)
    const response = await refreshTokenApi(challenge)
    assertSessionEpoch(refreshEpoch)
    const auth = response.data
    if (!auth?.access_token || !isSessionContext(auth.session_context)) {
      throw new HttpError(translate('shell.session.refreshResponseInvalid'), {
        status: 401,
        kind: 'invalid_response',
      })
    }
    const scopeChanged = applyAuthenticatedSession(auth.access_token, auth.session_context)
    notifyAccessTokenApplied(auth.access_token)
    const appliedEpoch = getSessionEpoch()
    if (scopeChanged) {
      await synchronizeTenantContextUi({ skipAuthRefresh: true, refreshContext: false })
    } else await ensureRoutesAfterAuthentication(true)
    assertSessionEpoch(appliedEpoch)
    return { token: auth.access_token, sessionEpoch: appliedEpoch }
  } finally {
    // 后端在刷新失败时会清理认证 Cookie；本次双提交挑战也必须同步作废，
    // 避免登录或后续刷新继续复用已经失去 Cookie 配对的内存令牌。
    invalidateCsrfToken()
  }
}

function notifyAccessTokenApplied(accessToken: string): void {
  locallyAppliedAccessToken = accessToken
  for (const listener of [...accessTokenAppliedListeners]) listener(accessToken)
}
