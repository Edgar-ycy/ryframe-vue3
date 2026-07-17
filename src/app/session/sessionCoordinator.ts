import type { Router } from 'vue-router'
import { ElMessage } from 'element-plus'
import { logout as logoutApi, refreshToken as refreshTokenApi } from '@/api/modules/auth'
import { usePermissionStore } from '@/stores/permission'
import { useTagsViewStore } from '@/stores/tagsView'
import { useUserStore } from '@/stores/user'
import {
  getRefreshToken,
  getTenantId,
  getToken,
  removeTenantId,
  removeToken,
  setRefreshToken,
  setToken,
} from '@/utils/auth'
import { configureHttpSession, HttpError } from '@/shared/http/client'

interface SessionRuntime {
  router: Router
  refreshAccessibleRoutes(): Promise<unknown>
  resetDynamicRoutes(): void
}

let runtime: SessionRuntime | undefined
let clearPromise: Promise<void> | undefined

export function installSessionCoordinator(sessionRuntime: SessionRuntime): void {
  runtime = sessionRuntime
  configureHttpSession({
    getAccessToken: getToken,
    getTenantId,
    refreshAccessToken,
    handleUnauthorized: async () => {
      ElMessage.error('登录已过期，请重新登录')
      await terminateSession()
    },
    reportError,
  })
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) throw new HttpError('无刷新令牌', 401)

  const response = await refreshTokenApi({ refresh_token: refreshToken }, getTenantId())
  const auth = response.data
  if (!auth?.access_token) throw new HttpError('刷新令牌失败', 401)

  setToken(auth.access_token)
  if (auth.refresh_token) setRefreshToken(auth.refresh_token)

  await useUserStore().getUserInfo()
  await runtime?.refreshAccessibleRoutes()
  return auth.access_token
}

function reportError(error: HttpError): void {
  if (error.status === 401) return
  if (error.status === 403) {
    ElMessage.error('没有操作权限')
    return
  }
  if (error.status === 404) {
    ElMessage.error(error.message || '请求的资源不存在')
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
    clearPromise = Promise.resolve().then(async () => {
      useUserStore().resetState()
      usePermissionStore().resetRoutes()
      useTagsViewStore().closeAllViews()
      removeToken()
      removeTenantId()
      runtime?.resetDynamicRoutes()
    }).finally(() => {
      clearPromise = undefined
    })
  }
  return clearPromise
}

export async function terminateSession(): Promise<void> {
  await clearSession()
  if (runtime?.router.currentRoute.value.path !== '/login') {
    await runtime?.router.replace('/login')
  }
}

export async function logoutSession(): Promise<void> {
  try {
    await logoutApi()
  } finally {
    await terminateSession()
  }
}
