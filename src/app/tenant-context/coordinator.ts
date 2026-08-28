import { getAuthContext } from '@/api/modules/authContext'
import { isSessionContext, sessionContextUserInfo } from '@/api/modules/sessionContext'
import type { SessionContext } from '@/features/session/contracts'
import {
  buildAccessibleMenus,
  buildRoutesFromMenuTree,
} from '@/features/navigation/routeProjection'
import { transitionAuthenticatedServerState } from '@/app/session/serverStateScope'
import { applyUserIdentity } from '@/app/session/userProjection'
import { HttpError, requireOperationData } from '@/shared/http/client'
import { deactivateServerStateScope } from '@/shared/query/client'
import { usePermissionStore } from '@/stores/permission'
import { useUserStore } from '@/stores/user'
import { useTenantContextStore } from '@/stores/tenantContext'

let loadGeneration = 0
let loadingIdentity = ''
let loadingPromise: Promise<void> | undefined

export function ensureTenantContextLoaded(options?: { force?: boolean }): Promise<void> {
  const identity = authenticatedIdentity()
  if (!identity) {
    return Promise.reject(new HttpError('当前登录身份已失效', { status: 401 }))
  }

  const store = useTenantContextStore()
  if (!options?.force && store.status === 'loaded' && store.identity === identity) {
    return Promise.resolve()
  }
  if (loadingPromise && loadingIdentity === identity) return loadingPromise

  const generation = ++loadGeneration
  loadingIdentity = identity
  store.markLoading()
  const pending = getAuthContext()
    .then((response) => {
      const context = requireOperationData(response)
      if (generation !== loadGeneration || authenticatedIdentity() !== identity) return
      if (!isSessionContext(context)) {
        throw new HttpError('会话上下文响应无效', { kind: 'invalid_response' })
      }
      if (contextIdentity(context) !== identity) {
        throw new HttpError('会话上下文与当前登录身份不一致', {
          kind: 'invalid_response',
        })
      }
      applyTenantSessionContext(context)
    })
    .catch((error: unknown) => {
      if (generation === loadGeneration && authenticatedIdentity() === identity) {
        failClosedTenantContext()
      }
      throw error
    })
    .finally(() => {
      if (loadingPromise === pending) {
        loadingPromise = undefined
        loadingIdentity = ''
      }
    })
  loadingPromise = pending
  return pending
}

export function refreshTenantContext(): Promise<void> {
  return ensureTenantContextLoaded({ force: true })
}

/** 校验并原子更新身份、上下文与路由投影。 */
export function applyTenantSessionContext(
  context: SessionContext,
  options: {
    applyCredentialProjection?: () => void
    forceNewServerStateScope?: boolean
  } = {},
): boolean {
  if (!isSessionContext(context)) {
    throw new HttpError('会话上下文响应无效', { kind: 'invalid_response' })
  }
  const userInfo = sessionContextUserInfo(context)
  if (!userInfo.tenant_id || !userInfo.id || !context.runtime_epoch) {
    throw new HttpError('会话上下文缺少身份或运行时纪元', {
      kind: 'invalid_response',
    })
  }
  const codes = context.capabilities.map((capability) => capability.code)
  if (new Set(codes).size !== codes.length) {
    throw new HttpError('会话上下文包含重复能力码', { kind: 'invalid_response' })
  }

  // 在局部变量中完成所有可失败的路由构建，避免留下半套授权状态。
  const routes = buildRoutesFromMenuTree(context.menus)
  const menus = buildAccessibleMenus(routes, context.permissions, codes)
  const contextStore = useTenantContextStore()
  const permissions = usePermissionStore()

  return transitionAuthenticatedServerState(
    context,
    () => {
      // 新范围发布前同步完成三个 Store 与凭据投影，避免观察者读取半套会话。
      applyUserIdentity(userInfo, context.is_super_admin)
      options.applyCredentialProjection?.()
      contextStore.applyContext(context, contextIdentity(context))
      permissions.applyRouteProjection(routes, menus)
    },
    { force: options.forceNewServerStateScope },
  )
}

export function failClosedTenantContext(): void {
  deactivateServerStateScope()
  useTenantContextStore().failClosedState()
  // 保留已认证身份与 access token 以便重试，但立即清除旧 RBAC 投影。
  useUserStore().$patch({
    isSuperAdmin: false,
    permissions: [],
    roles: [],
  })
  usePermissionStore().resetRoutes()
}

export function resetTenantContext(): void {
  loadGeneration += 1
  loadingIdentity = ''
  loadingPromise = undefined
  useTenantContextStore().resetState()
}

function authenticatedIdentity(): string | undefined {
  const user = useUserStore()
  if (user.sessionStatus !== 'authenticated' || !user.tenantId || !user.userId) return undefined
  return `${user.tenantId}\u0000${String(user.userId)}`
}

function contextIdentity(context: SessionContext): string {
  return `${context.user.tenant_id}\u0000${String(context.user.id)}`
}
