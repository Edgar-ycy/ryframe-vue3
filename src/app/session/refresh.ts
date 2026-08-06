import { refreshToken as refreshTokenApi, type UserInfo } from '@/api/modules/auth'
import { translate } from '@/i18n'
import { HttpError } from '@/shared/http/client'
import { useUserStore } from '@/stores/user'
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

export function getPendingRefresh(): Promise<string> | undefined {
  return refreshPromise
}

export async function refreshAccessToken(): Promise<string> {
  if (isSessionTerminating()) {
    throw new HttpError(translate('shell.session.terminating'), {
      status: 401,
      kind: 'cancelled',
    })
  }

  const callerEpoch = getSessionEpoch()
  const remoteOperation = getRemoteRefreshOperation()
  if (
    !refreshPromise
    && remoteOperation?.pending
    && remoteOperation.expiresAt > Date.now()
    && typeof window !== 'undefined'
  ) {
    try {
      const token = await waitForRemoteRefresh(remoteOperation)
      assertSessionEpoch(callerEpoch)
      return token
    }
    catch (error) {
      if (callerEpoch !== getSessionEpoch()) throw error
    }
  }

  if (!refreshPromise) {
    const refreshEpoch = getSessionEpoch()
    const operation = startLocalRefreshOperation()
    const pending = performRefresh(refreshEpoch)
      .then((token) => {
        assertSessionEpoch(refreshEpoch)
        broadcastAuthenticated(operation, token, userStoreToInfo(useUserStore()))
        return token
      })
      .catch((error: unknown) => {
        if (refreshEpoch === getSessionEpoch()) {
          broadcastRefreshFailed(
            operation,
            error instanceof HttpError ? error.status : undefined,
          )
        }
        throw error
      })
      .finally(() => {
        if (refreshPromise === pending) refreshPromise = undefined
      })
    refreshPromise = pending
  }
  return refreshPromise
}

async function performRefresh(refreshEpoch: number): Promise<string> {
  const tokenBeforeRefresh = useUserStore().token
  try {
    return await requestRefresh(false, refreshEpoch)
  }
  catch (error) {
    assertSessionEpoch(refreshEpoch)
    if (!(error instanceof HttpError) || error.status !== 409) throw error
    const delaySeconds = Math.min(Math.max(error.retryAfterSeconds ?? 5, 0), 10)
    await new Promise(resolve => setTimeout(resolve, delaySeconds * 1_000))
    assertSessionEpoch(refreshEpoch)
    const tokenFromAnotherTab = useUserStore().token
    if (tokenFromAnotherTab && tokenFromAnotherTab !== tokenBeforeRefresh) {
      return tokenFromAnotherTab
    }
    return requestRefresh(true, refreshEpoch)
  }
}

async function requestRefresh(forceCsrf: boolean, refreshEpoch: number): Promise<string> {
  const challenge = await ensureCsrfToken(forceCsrf)
  assertSessionEpoch(refreshEpoch)
  const response = await refreshTokenApi(challenge)
  assertSessionEpoch(refreshEpoch)
  const auth = response.data
  if (!auth?.access_token || !auth.user_info) {
    throw new HttpError(translate('shell.session.refreshResponseInvalid'), {
      status: 401,
      kind: 'invalid_response',
    })
  }
  applyAuthenticatedSession(auth.access_token, auth.user_info)
  await ensureRoutesAfterAuthentication(true)
  assertSessionEpoch(refreshEpoch)
  invalidateCsrfToken()
  return auth.access_token
}

function userStoreToInfo(user: ReturnType<typeof useUserStore>): UserInfo {
  return {
    id: user.userId,
    tenant_id: user.tenantId,
    tenant_name: user.tenantName,
    username: user.username,
    nickname: user.nickname,
    avatar: user.avatar || undefined,
    email: user.email,
    phone: user.phone,
    roles: [...user.roles],
    perms: [...user.permissions],
    ...(user.preferredLocale ? { preferred_locale: user.preferredLocale } : {}),
  } as UserInfo
}
