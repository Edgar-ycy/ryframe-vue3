import type { Router } from 'vue-router'
import { getUserInfo } from '@/api/modules/auth'
import { translate } from '@/i18n'
import { invalidateTenantServerState } from '@/shared/query/client'
import { useTagsViewStore } from '@/stores/tagsView'
import { useUserStore } from '@/stores/user'
import { hasPermission } from '@/utils/permission'
import {
  assertSessionEpoch,
  getSessionEpoch,
  getSessionRuntime,
} from './state'

let queuedAuthorizationEpoch = 0
let observedAuthorizationEpoch = 0
let authorizationRefreshPromise: Promise<void> | undefined
let authorizationIdentity = ''
let authorizationUiPromise: Promise<void> | undefined
let authorizationUiIdentity = ''

/** 记录受保护响应携带的授权纪元，并在发现更新时合并刷新。 */
export function observeAuthorizationEpoch(authorizationEpoch: number): void {
  void scheduleAuthorizationRefresh(authorizationEpoch).catch(() => undefined)
}

/** 处理 WebSocket 主动通知；返回值便于调用方观察本次同步是否成功。 */
export function notifyAuthorizationChanged(authorizationEpoch: number): Promise<void> {
  return scheduleAuthorizationRefresh(authorizationEpoch)
}

/** 会话清理时丢弃尚未开始的旧身份授权刷新。 */
export function resetAuthorizationObservation(): void {
  authorizationIdentity = ''
  queuedAuthorizationEpoch = 0
  observedAuthorizationEpoch = 0
  authorizationRefreshPromise = undefined
  authorizationUiIdentity = ''
  authorizationUiPromise = undefined
}

/**
 * 使用当前用户权限重新安装菜单和动态路由，不重新加载页面。
 * 调用方已经处于令牌刷新流程时可禁止再次触发认证刷新。
 */
export function synchronizeAuthorizationUi(
  options?: { skipAuthRefresh?: boolean },
): Promise<void> {
  const user = useUserStore()
  if (user.sessionStatus !== 'authenticated' || !user.userId) return Promise.resolve()
  const identity = identityKey(user.tenantId, String(user.userId))
  if (authorizationUiPromise && authorizationUiIdentity === identity) {
    return authorizationUiPromise
  }
  authorizationUiIdentity = identity
  const pending = performAuthorizationUiSynchronization(options).finally(() => {
    if (authorizationUiPromise !== pending) return
    authorizationUiPromise = undefined
    authorizationUiIdentity = ''
  })
  authorizationUiPromise = pending
  return pending
}

async function performAuthorizationUiSynchronization(
  options?: { skipAuthRefresh?: boolean },
): Promise<void> {
  const expectedSessionEpoch = getSessionEpoch()
  const user = useUserStore()
  if (user.sessionStatus !== 'authenticated' || !user.userId) return
  const tenantId = user.tenantId
  const userId = String(user.userId)
  const runtime = getSessionRuntime()
  if (!runtime) return

  await runtime.refreshAccessibleRoutes(options)
  assertSessionEpoch(expectedSessionEpoch)
  if (!isSameIdentity(tenantId, userId)) return

  pruneInaccessibleViews(runtime.router)
  const currentPath = runtime.router.currentRoute.value.fullPath
  if (!isAccessiblePath(runtime.router, currentPath)) {
    await runtime.router.replace('/403')
  }
  await invalidateTenantServerState(tenantId)
}

function scheduleAuthorizationRefresh(authorizationEpoch: number): Promise<void> {
  if (!Number.isSafeInteger(authorizationEpoch) || authorizationEpoch <= 0) {
    return Promise.resolve()
  }
  const user = useUserStore()
  if (user.sessionStatus !== 'authenticated' || !user.userId) return Promise.resolve()
  const identity = identityKey(user.tenantId, String(user.userId))
  if (authorizationIdentity !== identity) {
    authorizationIdentity = identity
    queuedAuthorizationEpoch = 0
    observedAuthorizationEpoch = 0
  }
  if (authorizationEpoch <= observedAuthorizationEpoch) return Promise.resolve()
  queuedAuthorizationEpoch = Math.max(queuedAuthorizationEpoch, authorizationEpoch)
  return ensureAuthorizationRefresh()
}

function ensureAuthorizationRefresh(): Promise<void> {
  if (authorizationRefreshPromise) return authorizationRefreshPromise
  let completed = false
  const pending = drainAuthorizationRefreshes()
    .then(() => {
      completed = true
    })
    .finally(() => {
      if (authorizationRefreshPromise !== pending) return
      authorizationRefreshPromise = undefined
      if (completed && queuedAuthorizationEpoch > 0) {
        void ensureAuthorizationRefresh().catch(() => undefined)
      }
    })
  authorizationRefreshPromise = pending
  return pending
}

async function drainAuthorizationRefreshes(): Promise<void> {
  while (queuedAuthorizationEpoch > 0) {
    const targetEpoch = queuedAuthorizationEpoch
    queuedAuthorizationEpoch = 0
    const user = useUserStore()
    if (targetEpoch <= observedAuthorizationEpoch) continue
    const expectedSessionEpoch = getSessionEpoch()
    const tenantId = user.tenantId
    const userId = String(user.userId)
    const response = await getUserInfo()
    assertSessionEpoch(expectedSessionEpoch)
    if (!isSameIdentity(tenantId, userId)) return
    if (!response.data) throw new Error(translate('shell.session.userInfoResponseMissing'))
    user.applyUserInfo(response.data)
    await synchronizeAuthorizationUi({ skipAuthRefresh: true })
    assertSessionEpoch(expectedSessionEpoch)
    observedAuthorizationEpoch = Math.max(observedAuthorizationEpoch, targetEpoch)
  }
}

function pruneInaccessibleViews(router: Router): void {
  const tags = useTagsViewStore()
  for (const view of [...tags.visitedViews]) {
    if (!isAccessiblePath(router, view.path)) tags.removeView(view)
  }
}

function isAccessiblePath(router: Router, path: string): boolean {
  let resolved: ReturnType<Router['resolve']>
  try {
    resolved = router.resolve(path)
  }
  catch {
    return false
  }
  if (
    resolved.matched.length === 0
    || resolved.matched.some(record => record.path === '/:pathMatch(.*)*')
  ) return false

  const user = useUserStore()
  return resolved.matched.every((record) => {
    if (!record.meta.requiresPermission) return true
    const required = record.meta.permission
    return typeof required === 'string'
      && hasPermission(user.permissions, required, user.roles)
  })
}

function isSameIdentity(tenantId: string, userId: string): boolean {
  const user = useUserStore()
  return user.sessionStatus === 'authenticated'
    && user.tenantId === tenantId
    && String(user.userId) === userId
}

function identityKey(tenantId: string, userId: string): string {
  return `${tenantId}\u0000${userId}`
}
