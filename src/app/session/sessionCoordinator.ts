import type { Router } from 'vue-router'
import { ElMessage } from 'element-plus'
import { translate } from '@/i18n'
import {
  getCsrfChallenge,
  logout as logoutApi,
  refreshToken as refreshTokenApi,
  type UserInfo,
} from '@/api/modules/auth'
import { usePermissionStore } from '@/stores/permission'
import { useTagsViewStore } from '@/stores/tagsView'
import { useUserStore } from '@/stores/user'
import { getTenantId } from '@/utils/auth'
import { configureHttpSession, HttpError } from '@/shared/http/client'
import { clearServerState } from '@/shared/query/client'
import {
  isSessionMessage,
  type SessionMessage,
  type SessionOutboundMessage,
} from './sessionMessage'

interface SessionRuntime {
  router: Router
  refreshAccessibleRoutes(options?: { skipAuthRefresh?: boolean }): Promise<unknown>
  resetDynamicRoutes(): void
}

const CHANNEL_NAME = 'ryframe-auth-v0.5'
const REMOTE_REFRESH_WAIT_MS = 8_000
const CSRF_EXPIRY_SKEW_MS = 5_000

function randomIdentifier(): string | undefined {
  if (typeof crypto !== 'undefined') {
    const randomUuid: unknown = Reflect.get(crypto, 'randomUUID')
    if (typeof randomUuid === 'function') {
      const value: unknown = randomUuid.call(crypto)
      if (typeof value === 'string' && value) return value
    }
    const values = crypto.getRandomValues(new Uint32Array(4))
    return [...values].map(value => value.toString(16).padStart(8, '0')).join('')
  }
  return undefined
}

const sourceId = randomIdentifier()

interface RemoteRefreshOperation {
  operationId: string
  source: string
  startedAt: number
  expiresAt: number
  pending: boolean
}

interface RemoteRefreshWaiter {
  operationId: string
  resolve(token: string): void
  reject(error: HttpError): void
  timeoutId?: number
}

let runtime: SessionRuntime | undefined
let channel: BroadcastChannel | undefined
let csrfToken: string | undefined
let csrfExpiresAt = 0
let csrfPromise: Promise<string> | undefined
let initializationPromise: Promise<void> | undefined
let refreshPromise: Promise<string> | undefined
let clearPromise: Promise<void> | undefined
let remoteRefreshOperation: RemoteRefreshOperation | undefined
let sessionEpoch = 0
let latestLogoutAt = 0
let latestSessionOperationAt = 0
let latestSessionOperationId: string | undefined
let latestSessionOperationIsLocal = false
let sessionTerminating = false
const remoteRefreshWaiters = new Set<RemoteRefreshWaiter>()

export function installSessionCoordinator(sessionRuntime: SessionRuntime): void {
  runtime = sessionRuntime
  installBroadcastChannel()
  configureHttpSession({
    getAccessToken: () => useUserStore().token || null,
    getTenantId,
    refreshAccessToken,
    handleRefreshFailure,
    reportError,
  })
}

function installBroadcastChannel(): void {
  if (
    !sourceId
    || channel
    || typeof window === 'undefined'
    || typeof BroadcastChannel === 'undefined'
  ) return
  channel = new BroadcastChannel(CHANNEL_NAME)
  channel.addEventListener('message', (event) => {
    if (isSessionMessage(event.data)) handleSessionMessage(event.data)
  })
}

function isNewerSessionOperation(
  message: Extract<SessionMessage, { type: 'refresh-start' }>,
): boolean {
  if (message.startedAt !== latestSessionOperationAt) {
    return message.startedAt > latestSessionOperationAt
  }
  if (latestSessionOperationIsLocal) return false
  return !latestSessionOperationId || message.operationId > latestSessionOperationId
}

function startRemoteRefresh(
  message: Extract<SessionMessage, { type: 'refresh-start' }>,
): void {
  if (message.startedAt <= latestLogoutAt) return
  if (!isNewerSessionOperation(message)) return

  latestSessionOperationAt = Math.max(latestSessionOperationAt, message.startedAt)
  latestSessionOperationId = message.operationId
  latestSessionOperationIsLocal = false
  const next: RemoteRefreshOperation = {
    operationId: message.operationId,
    source: message.source,
    startedAt: message.startedAt,
    expiresAt: Date.now() + REMOTE_REFRESH_WAIT_MS,
    pending: true,
  }
  remoteRefreshOperation = next
  for (const waiter of remoteRefreshWaiters) scheduleRemoteRefreshWaiter(waiter, next)
}

function matchesCurrentRemoteRefresh(
  message: Extract<SessionMessage, { type: 'authenticated' | 'refresh-failed' }>,
): message is Extract<SessionMessage, { type: 'authenticated' | 'refresh-failed' }> {
  const current = remoteRefreshOperation
  if (
    !current?.pending
    || current.operationId !== message.operationId
    || current.source !== message.source
    || current.startedAt !== message.startedAt
    || message.startedAt <= latestLogoutAt
    || sessionTerminating
    || latestSessionOperationIsLocal
    || latestSessionOperationAt !== current.startedAt
    || latestSessionOperationId !== current.operationId
  ) return false

  if (current.expiresAt <= Date.now()) {
    current.pending = false
    return false
  }
  return true
}

function settleRemoteRefreshWaiters(
  operationId: string,
  settle: (waiter: RemoteRefreshWaiter) => void,
): void {
  for (const waiter of remoteRefreshWaiters) {
    if (waiter.operationId !== operationId) continue
    remoteRefreshWaiters.delete(waiter)
    if (waiter.timeoutId !== undefined) clearTimeout(waiter.timeoutId)
    settle(waiter)
  }
}

function handleSessionMessage(message: SessionMessage): void {
  if (message.source === sourceId) return
  if (message.type === 'refresh-start') {
    startRemoteRefresh(message)
    return
  }
  if (message.type === 'authenticated') {
    if (!matchesCurrentRemoteRefresh(message)) return
    remoteRefreshOperation!.pending = false
    applyAuthenticatedSession(message.accessToken, message.userInfo)
    void refreshRoutesAfterAuthentication(true).catch(async (error: unknown) => {
      if (error instanceof HttpError && (error.status === 401 || error.status === 403)) {
        await handleRefreshFailure(error)
      }
    })
    settleRemoteRefreshWaiters(message.operationId, waiter => waiter.resolve(message.accessToken))
    return
  }
  if (message.type === 'refresh-failed') {
    if (!matchesCurrentRemoteRefresh(message)) return
    remoteRefreshOperation!.pending = false
    const error = new HttpError(translate('shell.session.otherTabRefreshFailed'), message.status)
    settleRemoteRefreshWaiters(message.operationId, waiter => waiter.reject(error))
    return
  }
  if (message.type === 'logout') {
    if (message.at <= latestLogoutAt) return
    latestLogoutAt = message.at
    latestSessionOperationAt = Math.max(latestSessionOperationAt, message.at)
    latestSessionOperationId = undefined
    latestSessionOperationIsLocal = false
    void handleRemoteLogout()
  }
}

function postMessage(message: SessionOutboundMessage): void {
  if (!sourceId) return
  try {
    channel?.postMessage({ ...message, source: sourceId })
  }
  catch {
    // 跨标签页协调只是优化，绝不能使本地已成功完成的登录或刷新失效。
  }
}

export async function ensureCsrfToken(force = false): Promise<string> {
  if (!force && csrfToken && Date.now() + CSRF_EXPIRY_SKEW_MS < csrfExpiresAt) {
    return csrfToken
  }
  if (!csrfPromise) {
    csrfPromise = getCsrfChallenge()
      .then((response) => {
        const challenge = response.data
        if (!challenge?.csrf_token || !challenge.expires_in) {
          throw new HttpError(translate('shell.session.csrfChallengeInvalid'), 503)
        }
        csrfToken = challenge.csrf_token
        csrfExpiresAt = Date.now() + challenge.expires_in * 1_000
        return challenge.csrf_token
      })
      .finally(() => {
        csrfPromise = undefined
      })
  }
  return csrfPromise
}

function invalidateCsrfToken(): void {
  csrfToken = undefined
  csrfExpiresAt = 0
}

export function publishAuthenticatedSession(accessToken: string, userInfo: UserInfo): void {
  applyAuthenticatedSession(accessToken, userInfo)
  invalidateCsrfToken()
  const startedAt = nextSessionOperationTime()
  const operationId = createOperationId(startedAt)
  postMessage({ type: 'refresh-start', operationId, startedAt })
  postMessage({
    type: 'authenticated',
    operationId,
    startedAt,
    accessToken,
    userInfo,
  })
}

function applyAuthenticatedSession(accessToken: string, userInfo: UserInfo): void {
  const userStore = useUserStore()
  userStore.token = accessToken
  userStore.sessionStatus = 'authenticated'
  userStore.applyUserInfo(userInfo)
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
          : new HttpError(translate('shell.session.initializationFailed'), undefined, undefined, error)
        if (httpError.status === 503) {
          useUserStore().sessionStatus = 'unavailable'
          return
        }
        await clearSession()
      })
      .finally(() => {
        if (initializationPromise === pending) initializationPromise = undefined
      })
    initializationPromise = pending
  }
  return initializationPromise
}

function scheduleRemoteRefreshWaiter(
  waiter: RemoteRefreshWaiter,
  operation: RemoteRefreshOperation,
): void {
  if (waiter.timeoutId !== undefined) clearTimeout(waiter.timeoutId)
  waiter.operationId = operation.operationId
  const remaining = operation.expiresAt - Date.now()
  waiter.timeoutId = window.setTimeout(() => {
    if (!remoteRefreshWaiters.delete(waiter)) return
    if (
      remoteRefreshOperation?.operationId === waiter.operationId
      && remoteRefreshOperation.pending
    ) {
      remoteRefreshOperation.pending = false
    }
    waiter.reject(new HttpError(translate('shell.session.remoteRefreshTimeout'), 409))
  }, Math.max(remaining, 0))
}

async function waitForRemoteRefresh(operation: RemoteRefreshOperation): Promise<string> {
  if (!operation.pending || operation.expiresAt <= Date.now()) {
    operation.pending = false
    throw new HttpError(translate('shell.session.remoteRefreshFinished'), 409)
  }
  return new Promise<string>((resolve, reject) => {
    const waiter: RemoteRefreshWaiter = {
      operationId: operation.operationId,
      resolve,
      reject,
    }
    remoteRefreshWaiters.add(waiter)
    scheduleRemoteRefreshWaiter(waiter, operation)
  })
}

export async function refreshAccessToken(): Promise<string> {
  if (sessionTerminating) throw new HttpError(translate('shell.session.terminating'), 401)
  const callerEpoch = sessionEpoch
  const remoteOperation = remoteRefreshOperation
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
      if (callerEpoch !== sessionEpoch) throw error
    }
  }
  if (!refreshPromise) {
    const refreshEpoch = sessionEpoch
    const startedAt = nextSessionOperationTime()
    const operationId = createOperationId(startedAt)
    postMessage({ type: 'refresh-start', operationId, startedAt })
    refreshPromise = performRefresh(refreshEpoch)
      .then((token) => {
        assertSessionEpoch(refreshEpoch)
        const userStore = useUserStore()
        postMessage({
          type: 'authenticated',
          operationId,
          startedAt,
          accessToken: token,
          userInfo: userStoreToInfo(userStore),
        })
        return token
      })
      .catch((error: unknown) => {
        if (refreshEpoch === sessionEpoch) {
          postMessage({
            type: 'refresh-failed',
            operationId,
            startedAt,
            status: error instanceof HttpError ? error.status : undefined,
          })
        }
        throw error
      })
      .finally(() => {
        refreshPromise = undefined
      })
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
    if (tokenFromAnotherTab && tokenFromAnotherTab !== tokenBeforeRefresh) return tokenFromAnotherTab
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
    throw new HttpError(translate('shell.session.refreshResponseInvalid'), 401)
  }
  applyAuthenticatedSession(auth.access_token, auth.user_info)
  try {
    await refreshRoutesAfterAuthentication(true)
    assertSessionEpoch(refreshEpoch)
  }
  catch (error) {
    if (refreshEpoch !== sessionEpoch) await clearSession()
    throw error
  }
  invalidateCsrfToken()
  return auth.access_token
}

async function refreshRoutesAfterAuthentication(skipAuthRefresh = false): Promise<void> {
  await runtime?.refreshAccessibleRoutes({ skipAuthRefresh })
}

async function handleRemoteLogout(): Promise<void> {
  sessionTerminating = true
  try {
    await clearSession()
    if (runtime?.router.currentRoute.value.path !== '/login') {
      await runtime?.router.replace('/login')
    }
  }
  finally {
    sessionTerminating = false
  }
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

async function handleRefreshFailure(error: HttpError): Promise<void> {
  if (error.status === 503) {
    useUserStore().sessionStatus = 'unavailable'
    ElMessage.error(translate('shell.session.authUnavailable'))
    return
  }
  if (error.status === 401 || error.status === 403) {
    ElMessage.error(translate('shell.session.expired'))
    await terminateSession()
  }
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

export async function clearSession(): Promise<void> {
  if (!clearPromise) {
    invalidateSessionOperations()
    clearPromise = Promise.resolve()
      .then(() => {
        clearServerState()
        useUserStore().resetState()
        usePermissionStore().resetRoutes()
        useTagsViewStore().closeAllViews()
        invalidateCsrfToken()
        runtime?.resetDynamicRoutes()
      })
      .finally(() => {
        clearPromise = undefined
      })
  }
  return clearPromise
}

export async function terminateSession(): Promise<void> {
  sessionTerminating = true
  try {
    await clearSession()
    const logoutAt = latestLogoutAt
    postMessage({ type: 'logout', at: logoutAt })
    if (runtime?.router.currentRoute.value.path !== '/login') {
      await runtime?.router.replace('/login')
    }
  }
  finally {
    sessionTerminating = false
  }
}

export async function logoutSession(): Promise<void> {
  sessionTerminating = true
  const accessToken = useUserStore().token || undefined
  const pendingRefresh = refreshPromise
  invalidateSessionOperations()
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

function nextSessionOperationTime(): number {
  latestSessionOperationAt = Math.max(
    Date.now(),
    latestLogoutAt + 1,
    latestSessionOperationAt + 1,
  )
  return latestSessionOperationAt
}

function createOperationId(startedAt: number): string {
  const nonce = randomIdentifier()
  const operationId = sourceId && nonce
    ? `${sourceId}:${startedAt}:${nonce}`
    : `local:${startedAt}`
  latestSessionOperationAt = Math.max(latestSessionOperationAt, startedAt)
  latestSessionOperationId = operationId
  latestSessionOperationIsLocal = true
  if (remoteRefreshOperation?.pending) remoteRefreshOperation.pending = false
  return operationId
}

function assertSessionEpoch(expected: number): void {
  if (expected !== sessionEpoch || sessionTerminating) {
    throw new HttpError(translate('shell.session.operationCancelled'), 401)
  }
}

function invalidateSessionOperations(): void {
  sessionEpoch += 1
  latestLogoutAt = Math.max(latestLogoutAt, Date.now())
  latestSessionOperationAt = Math.max(latestSessionOperationAt, latestLogoutAt)
  latestSessionOperationId = undefined
  latestSessionOperationIsLocal = true
  remoteRefreshOperation = undefined
  const error = new HttpError(translate('shell.session.operationCancelled'), 401)
  for (const waiter of remoteRefreshWaiters) {
    if (waiter.timeoutId !== undefined) clearTimeout(waiter.timeoutId)
    waiter.reject(error)
  }
  remoteRefreshWaiters.clear()
}
