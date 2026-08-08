import { ElMessage } from 'element-plus'
import { logout as logoutApi, type UserInfo } from '@/api/modules/auth'
import { translate } from '@/i18n'
import { configureHttpSession, HttpError } from '@/shared/http/client'
import {
  clearServerState,
  configureServerStateErrorReporter,
} from '@/shared/query/client'
import { usePermissionStore } from '@/stores/permission'
import { useTagsViewStore } from '@/stores/tagsView'
import { useUserStore } from '@/stores/user'
import { getTenantId } from '@/utils/auth'
import {
  observeAuthorizationEpoch,
  resetAuthorizationObservation,
  synchronizeAuthorizationUi,
} from './authorization'
import {
  broadcastAuthenticated,
  broadcastLogout,
  installSessionChannel,
  invalidateSessionChannelOperations,
  startLocalRefreshOperation,
} from './channel'
import { ensureCsrfToken, invalidateCsrfToken } from './csrf'
import { getPendingRefresh, refreshAccessToken } from './refresh'
import {
  applyAuthenticatedSession,
  ensureRoutesAfterAuthentication,
  getSessionRuntime,
  invalidateSessionEpoch,
  isSessionTerminating,
  setSessionRuntime,
  setSessionTerminating,
  type SessionRuntime,
} from './state'

let initializationPromise: Promise<void> | undefined
let clearPromise: Promise<void> | undefined

export function installSessionCoordinator(sessionRuntime: SessionRuntime): void {
  setSessionRuntime(sessionRuntime)
  installSessionChannel({
    isTerminating: isSessionTerminating,
    onAuthenticated: (accessToken, userInfo) => {
      const scopeChanged = applyAuthenticatedSession(accessToken, userInfo)
      const synchronization = scopeChanged
        ? synchronizeAuthorizationUi({ skipAuthRefresh: true })
        : ensureRoutesAfterAuthentication(true)
      void synchronization
        .catch(async (error: unknown) => {
          if (error instanceof HttpError && (error.status === 401 || error.status === 403)) {
            await handleRefreshFailure(error)
          }
        })
    },
    onRefreshFailed: () => undefined,
    onLogout: () => {
      void handleRemoteLogout()
    },
  })
  configureHttpSession({
    getAccessToken: () => useUserStore().token || null,
    getTenantId,
    observeAuthorizationEpoch,
    refreshAccessToken,
    handleRefreshFailure,
  })
  configureServerStateErrorReporter(reportError)
}

export function publishAuthenticatedSession(accessToken: string, userInfo: UserInfo): void {
  applyAuthenticatedSession(accessToken, userInfo)
  invalidateCsrfToken()
  const operation = startLocalRefreshOperation()
  broadcastAuthenticated(operation, accessToken, userInfo)
}

export function initializeSession(): Promise<void> {
  const status = useUserStore().sessionStatus
  if (status === 'authenticated' || status === 'anonymous') return Promise.resolve()
  if (!initializationPromise) {
    useUserStore().sessionStatus = 'initializing'
    const pending = refreshAccessToken()
      .then(() => undefined)
      .catch(async (error: unknown) => {
        const httpError = error instanceof HttpError
          ? error
          : new HttpError(translate('shell.session.initializationFailed'), {
              kind: 'unknown',
              cause: error,
            })
        if (httpError.status === 401 || httpError.status === 403) {
          await clearSession()
        }
        else {
          // 临时依赖或传输故障保留内存凭据，便于后续恢复。
          useUserStore().sessionStatus = 'unavailable'
        }
      })
      .finally(() => {
        if (initializationPromise === pending) initializationPromise = undefined
      })
    initializationPromise = pending
  }
  return initializationPromise
}

async function handleRemoteLogout(): Promise<void> {
  setSessionTerminating(true)
  try {
    await clearSession()
    const runtime = getSessionRuntime()
    if (runtime?.router.currentRoute.value.path !== '/login') {
      await runtime?.router.replace('/login')
    }
  }
  finally {
    setSessionTerminating(false)
  }
}

async function handleRefreshFailure(error: HttpError): Promise<void> {
  if (error.status === 401 || error.status === 403) {
    ElMessage.error(translate('shell.session.expired'))
    await terminateSession()
    return
  }

  // 非鉴权故障允许原会话稍后恢复。
  useUserStore().sessionStatus = 'unavailable'
  ElMessage.error(translate('shell.session.authUnavailable'))
}

function reportError(error: HttpError): void {
  if (error.status === 401) {
    ElMessage.error(error.message || translate('shell.session.invalid'))
    return
  }
  if (error.status === 403) {
    ElMessage.error(translate('shell.session.forbidden'))
    return
  }
  if (error.status === 404) {
    ElMessage.error(error.message || translate('shell.session.notFound'))
    return
  }
  if (error.status === 503) {
    ElMessage.error(translate('shell.session.serviceUnavailable'))
    return
  }
  if (error.status && error.status >= 500) {
    ElMessage.error(translate('shell.session.serverError'))
    return
  }
  ElMessage.error(error.message || translate('shell.session.requestFailed'))
}

export function clearSession(): Promise<void> {
  if (!clearPromise) {
    invalidateSessionEpoch()
    invalidateSessionChannelOperations()
    const pending = Promise.resolve()
      .then(() => {
        resetAuthorizationObservation()
        clearServerState()
        useUserStore().resetState()
        usePermissionStore().resetRoutes()
        useTagsViewStore().closeAllViews()
        invalidateCsrfToken()
        getSessionRuntime()?.resetDynamicRoutes()
      })
      .finally(() => {
        if (clearPromise === pending) clearPromise = undefined
      })
    clearPromise = pending
  }
  return clearPromise
}

export async function terminateSession(): Promise<void> {
  setSessionTerminating(true)
  try {
    await clearSession()
    broadcastLogout()
    const runtime = getSessionRuntime()
    if (runtime?.router.currentRoute.value.path !== '/login') {
      await runtime?.router.replace('/login')
    }
  }
  finally {
    setSessionTerminating(false)
  }
}

export async function logoutSession(): Promise<void> {
  setSessionTerminating(true)
  const accessToken = useUserStore().token || undefined
  const pendingRefresh = getPendingRefresh()
  await clearSession()
  try {
    await pendingRefresh?.catch(() => undefined)
    const challenge = await ensureCsrfToken(true)
    await logoutApi(challenge, accessToken)
  }
  catch {
    ElMessage.warning(translate('shell.session.logoutFailed'))
  }
  finally {
    await terminateSession()
  }
}
