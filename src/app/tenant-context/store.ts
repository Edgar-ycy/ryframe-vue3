import { defineStore } from 'pinia'
import { getAuthContext } from '@/api/modules/authContext'
import {
  sessionContextUserInfo,
  isSessionContext,
  type SessionContext,
  type TenantBusinessDataContext,
} from '@/api/modules/sessionContext'
import { buildAccessibleMenus, buildRoutesFromMenuTree } from '@/router/menuRouteBuilder'
import { HttpError, requireOperationData } from '@/shared/http/client'
import { usePermissionStore } from '@/stores/permission'
import { useUserStore } from '@/stores/user'
import {
  capabilityCodes,
  hasCapabilities,
  hasCapability,
} from './capability'

type TenantContextStatus = 'idle' | 'loading' | 'loaded' | 'failed'

interface TenantContextState {
  status: TenantContextStatus
  identity: string
  authorizationEpoch: string
  runtimeEpoch: string
  businessData?: TenantBusinessDataContext
  context?: SessionContext
}

let loadGeneration = 0
let loadingIdentity = ''
let loadingPromise: Promise<void> | undefined

function authenticatedIdentity(): string | undefined {
  const user = useUserStore()
  if (user.sessionStatus !== 'authenticated' || !user.tenantId || !user.userId) return undefined
  return `${user.tenantId}\u0000${String(user.userId)}`
}

function contextIdentity(context: SessionContext): string {
  return `${context.user.tenant_id}\u0000${String(context.user.id)}`
}

export const useTenantContextStore = defineStore('tenant-context', {
  state: (): TenantContextState => ({
    status: 'idle',
    identity: '',
    authorizationEpoch: '',
    runtimeEpoch: '',
    businessData: undefined,
    context: undefined,
  }),

  getters: {
    capabilityCodes: state => state.status === 'loaded'
      ? capabilityCodes(state.context?.capabilities ?? [])
      : [],
    hasCapability: state => (code: string): boolean => state.status === 'loaded'
      && hasCapability(state.context?.capabilities ?? [], code),
    hasCapabilities: state => (codes: readonly string[]): boolean => state.status === 'loaded'
      && hasCapabilities(state.context?.capabilities ?? [], codes),
    canWriteBusinessData: state => state.status === 'loaded'
      && state.businessData?.state === 'active',
  },

  actions: {
    ensureLoaded(options?: { force?: boolean }): Promise<void> {
      const identity = authenticatedIdentity()
      if (!identity) {
        return Promise.reject(new HttpError('当前登录身份已失效', { status: 401 }))
      }
      if (!options?.force && this.status === 'loaded' && this.identity === identity) {
        return Promise.resolve()
      }
      if (loadingPromise && loadingIdentity === identity) return loadingPromise

      const generation = ++loadGeneration
      loadingIdentity = identity
      this.status = 'loading'
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
          this.applySessionContext(context)
        })
        .catch((error: unknown) => {
          if (generation === loadGeneration && authenticatedIdentity() === identity) {
            this.failClosed()
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
    },

    refresh(): Promise<void> {
      return this.ensureLoaded({ force: true })
    },

    /** 同步写入用户、能力和菜单，任一校验失败时不保留部分授权状态。 */
    applySessionContext(context: SessionContext): void {
      if (!isSessionContext(context)) {
        throw new HttpError('会话上下文响应无效', { kind: 'invalid_response' })
      }
      const userInfo = sessionContextUserInfo(context)
      if (!userInfo.tenant_id || !userInfo.id || !context.runtime_epoch) {
        throw new HttpError('会话上下文缺少身份或运行时纪元', {
          kind: 'invalid_response',
        })
      }
      const codes = capabilityCodes(context.capabilities)
      if (new Set(codes).size !== codes.length) {
        throw new HttpError('会话上下文包含重复能力码', { kind: 'invalid_response' })
      }

      // 先在局部变量中完成所有可失败的路由构建，避免留下半套授权状态。
      const routes = buildRoutesFromMenuTree(context.menus)
      const menus = buildAccessibleMenus(routes, context.permissions, codes)

      const user = useUserStore()
      const permissions = usePermissionStore()
      // 跨身份或授权快照切换期间先关闭能力门禁，避免两个 Pinia store 短暂混用新旧投影。
      this.status = 'loading'
      user.applyUserInfo(userInfo, context.is_super_admin)
      this.$patch((state) => {
        state.status = 'loaded'
        state.identity = contextIdentity(context)
        state.authorizationEpoch = context.authorization_epoch
        state.runtimeEpoch = context.runtime_epoch
        state.businessData = context.business_data
        state.context = context
      })
      permissions.applyGeneratedRoutes(routes, menus)
    },

    failClosed(): void {
      this.status = 'failed'
      this.identity = ''
      this.authorizationEpoch = ''
      this.runtimeEpoch = ''
      this.businessData = undefined
      this.context = undefined
      const user = useUserStore()
      // 保留已认证身份与 access token 以便用户重试上下文加载，但绝不能继续
      // 使用上一个快照中的 RBAC 投影。按钮、导航与后续路由判定都会立即失权。
      user.$patch({
        isSuperAdmin: false,
        permissions: [],
        roles: [],
      })
      usePermissionStore().resetRoutes()
    },

    reset(): void {
      loadGeneration += 1
      loadingIdentity = ''
      loadingPromise = undefined
      this.status = 'idle'
      this.identity = ''
      this.authorizationEpoch = ''
      this.runtimeEpoch = ''
      this.businessData = undefined
      this.context = undefined
    },
  },
})
