import type { Router } from 'vue-router'
import { ElMessage } from 'element-plus'
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

interface SessionRuntime {
  router: Router
  refreshAccessibleRoutes(options?: { skipAuthRefresh?: boolean }): Promise<unknown>
  resetDynamicRoutes(): void
}

type SessionMessage =
  | { type: 'refresh-start'; source: string; startedAt: number }
  | { type: 'authenticated'; source: string; startedAt: number; accessToken: string; userInfo: UserInfo }
  | { type: 'refresh-failed'; source: string; startedAt: number; status?: number }
  | { type: 'logout'; source: string; at: number }

type SessionOutboundMessage =
  | { type: 'refresh-start'; startedAt: number }
  | { type: 'authenticated'; startedAt: number; accessToken: string; userInfo: UserInfo }
  | { type: 'refresh-failed'; startedAt: number; status?: number }
  | { type: 'logout'; at: number }

const CHANNEL_NAME = 'ryframe-auth-v0.5'
const REMOTE_REFRESH_WAIT_MS = 8_000
const CSRF_EXPIRY_SKEW_MS = 5_000
const sourceId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
  ? crypto.randomUUID()
  : `${Date.now()}-${Math.random()}`

let runtime: SessionRuntime | undefined
let channel: BroadcastChannel | undefined
let csrfToken: string | undefined
let csrfExpiresAt = 0
let csrfPromise: Promise<string> | undefined
let initializationPromise: Promise<void> | undefined
let refreshPromise: Promise<string> | undefined
let clearPromise: Promise<void> | undefined
let remoteRefreshUntil = 0
let sessionEpoch = 0
let latestLogoutAt = 0
let sessionTerminating = false
const remoteRefreshWaiters = new Set<{
  resolve(token: string): void
  reject(error: HttpError): void
}>()

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
  if (channel || typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return
  channel = new BroadcastChannel(CHANNEL_NAME)
  channel.addEventListener('message', event => handleSessionMessage(event.data as SessionMessage))
}

function handleSessionMessage(message: SessionMessage): void {
  if (!message || message.source === sourceId) return
  if (message.type === 'refresh-start') {
    if (!Number.isFinite(message.startedAt) || message.startedAt <= latestLogoutAt) return
    remoteRefreshUntil = Date.now() + REMOTE_REFRESH_WAIT_MS
    return
  }
  if (message.type === 'authenticated') {
    if (
      !Number.isFinite(message.startedAt)
      || message.startedAt <= latestLogoutAt
      || sessionTerminating
    ) return
    remoteRefreshUntil = 0
    applyAuthenticatedSession(message.accessToken, message.userInfo)
    void refreshRoutesAfterAuthentication(true).catch(async (error: unknown) => {
      if (error instanceof HttpError && (error.status === 401 || error.status === 403)) {
        await handleRefreshFailure(error)
      }
    })
    for (const waiter of remoteRefreshWaiters) waiter.resolve(message.accessToken)
    remoteRefreshWaiters.clear()
    return
  }
  if (message.type === 'refresh-failed') {
    if (!Number.isFinite(message.startedAt) || message.startedAt <= latestLogoutAt) return
    remoteRefreshUntil = 0
    const error = new HttpError('其他标签页刷新会话失败', message.status)
    for (const waiter of remoteRefreshWaiters) waiter.reject(error)
    remoteRefreshWaiters.clear()
    return
  }
  if (message.type === 'logout') {
    const logoutAt = Number.isFinite(message.at) ? message.at : Date.now()
    latestLogoutAt = Math.max(latestLogoutAt, logoutAt)
    void handleRemoteLogout()
  }
}

function postMessage(message: SessionOutboundMessage): void {
  try {
    channel?.postMessage({ ...message, source: sourceId })
  }
  catch {
    // Cross-tab coordination is an optimization; it must never invalidate a
    // locally successful login or refresh.
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
          throw new HttpError('CSRF challenge 响应无效', 503)
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
  postMessage({
    type: 'authenticated',
    startedAt: nextSessionOperationTime(),
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
        const httpError = error instanceof HttpError ? error : new HttpError('会话初始化失败', undefined, undefined, error)
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

async function waitForRemoteRefresh(): Promise<string> {
  const remaining = remoteRefreshUntil - Date.now()
  if (remaining <= 0) throw new HttpError('远端刷新等待已结束', 409)
  return new Promise<string>((resolve, reject) => {
    const waiter = { resolve, reject }
    remoteRefreshWaiters.add(waiter)
    window.setTimeout(() => {
      if (!remoteRefreshWaiters.delete(waiter)) return
      reject(new HttpError('等待其他标签页刷新超时', 409))
    }, remaining)
  })
}

export async function refreshAccessToken(): Promise<string> {
  if (sessionTerminating) throw new HttpError('会话正在退出', 401)
  const callerEpoch = sessionEpoch
  if (!refreshPromise && remoteRefreshUntil > Date.now() && typeof window !== 'undefined') {
    try {
      const token = await waitForRemoteRefresh()
      assertSessionEpoch(callerEpoch)
      return token
    }
    catch (error) {
      if (callerEpoch !== sessionEpoch) throw error
      remoteRefreshUntil = 0
    }
  }
  if (!refreshPromise) {
    const refreshEpoch = sessionEpoch
    const startedAt = nextSessionOperationTime()
    postMessage({ type: 'refresh-start', startedAt })
    refreshPromise = performRefresh(refreshEpoch)
      .then((token) => {
        assertSessionEpoch(refreshEpoch)
        const userStore = useUserStore()
        postMessage({
          type: 'authenticated',
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
  if (!auth?.access_token || !auth.user_info) throw new HttpError('刷新会话响应无效', 401)
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
    tenant_name: user.tenantName || undefined,
    username: user.username,
    nickname: user.nickname || undefined,
    avatar: user.avatar || undefined,
    email: user.email || undefined,
    phone: user.phone || undefined,
    roles: [...user.roles],
    perms: [...user.permissions],
  } as UserInfo
}

async function handleRefreshFailure(error: HttpError): Promise<void> {
  if (error.status === 503) {
    useUserStore().sessionStatus = 'unavailable'
    ElMessage.error('认证服务暂不可用，请稍后重试')
    return
  }
  if (error.status === 401 || error.status === 403) {
    ElMessage.error('登录已过期，请重新登录')
    await terminateSession()
  }
}

function reportError(error: HttpError): void {
  if (error.status === 401) {
    ElMessage.error(error.message || '登录已失效，请重新登录')
    return
  }
  if (error.status === 403) {
    ElMessage.error('没有操作权限')
    return
  }
  if (error.status === 404) {
    ElMessage.error(error.message || '请求的资源不存在')
    return
  }
  if (error.status === 503) {
    ElMessage.error('服务暂不可用，请稍后重试')
    return
  }
  if (error.status && error.status >= 500) {
    ElMessage.error('服务器内部错误')
    return
  }
  ElMessage.error(error.message || '请求失败')
}

export async function clearSession(): Promise<void> {
  if (!clearPromise) {
    invalidateSessionOperations()
    clearPromise = Promise.resolve()
      .then(() => {
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
    ElMessage.warning('本地会话已清除，但服务器会话撤销失败，请稍后重试')
  }
  finally {
    await terminateSession()
  }
}

function nextSessionOperationTime(): number {
  return Math.max(Date.now(), latestLogoutAt + 1)
}

function assertSessionEpoch(expected: number): void {
  if (expected !== sessionEpoch || sessionTerminating) {
    throw new HttpError('会话操作已取消', 401)
  }
}

function invalidateSessionOperations(): void {
  sessionEpoch += 1
  latestLogoutAt = Math.max(latestLogoutAt, Date.now())
  remoteRefreshUntil = 0
  const error = new HttpError('会话操作已取消', 401)
  for (const waiter of remoteRefreshWaiters) waiter.reject(error)
  remoteRefreshWaiters.clear()
}
