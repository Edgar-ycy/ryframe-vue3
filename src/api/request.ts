import axios, { type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import {
  getRefreshToken,
  getTenantId,
  getToken,
  removeTenantId,
  setRefreshToken,
  setToken,
} from '@/utils/auth'
import { refreshToken as refreshTokenApi } from '@/api/modules/auth'
import type { ApiResponse } from '@/api/types'

export type { ApiResponse } from '@/api/types'

function getResponseMessage(data: any, fallback = '请求失败') {
  return data?.msg || fallback
}

function removeJsonContentTypeForFormData(config: InternalAxiosRequestConfig) {
  if (!(config.data instanceof FormData)) return

  const headers = config.headers as any
  if (typeof headers.delete === 'function') {
    headers.delete('Content-Type')
    headers.delete('content-type')
  } else {
    delete headers['Content-Type']
    delete headers['content-type']
  }
}

const service = axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_API,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

let isRefreshing = false
let refreshQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = []

async function doRefreshToken(): Promise<string> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) throw new Error('无刷新令牌')

  const res = (await refreshTokenApi({ refresh_token: refreshToken })) as any
  const newToken = res.data?.access_token || res.access_token
  const newRefreshToken = res.data?.refresh_token || res.refresh_token

  if (!newToken) throw new Error('刷新令牌失败')

  setToken(newToken)
  if (newRefreshToken) {
    setRefreshToken(newRefreshToken)
  }

  const [{ useUserStore }, { refreshAccessibleRoutes }] = await Promise.all([
    import('@/stores/user'),
    import('@/router'),
  ])
  await useUserStore().getUserInfo()
  await refreshAccessibleRoutes()
  return newToken
}

function redirectToLogin() {
  import('@/stores/user')
    .then(({ useUserStore }) => useUserStore().clearClientState())
    .finally(() => {
      removeTenantId()
      import('@/router').then(({ default: router }) => {
        router.push('/login').then()
      })
    })
}

service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    if (!config.headers['X-Tenant-Id']) {
      config.headers['X-Tenant-Id'] = getTenantId()
    }

    removeJsonContentTypeForFormData(config)
    return config
  },
  error => Promise.reject(error),
)

service.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { data } = response

    if (response.config.responseType === 'blob') {
      return response as any
    }

    if (data.code === 200) {
      return data
    }

    ElMessage.error(getResponseMessage(data))
    return Promise.reject(new Error(getResponseMessage(data, 'Error')))
  },
  async (error) => {
    if (!error.response) {
      ElMessage.error('网络异常，请检查连接')
      return Promise.reject(error)
    }

    const { status, data, config } = error.response

    switch (status) {
      case 400:
        ElMessage.error(getResponseMessage(data, '请求参数错误'))
        break
      case 401: {
        if (['/login', '/reset-password'].includes(window.location.pathname)) {
          ElMessage.error(getResponseMessage(data))
          break
        }

        if (config.url?.includes('/auth/refresh')) {
          redirectToLogin()
          break
        }

        if (!isRefreshing) {
          isRefreshing = true
          try {
            const newToken = await doRefreshToken()
            isRefreshing = false
            refreshQueue.forEach(({ resolve }) => resolve(newToken))
            refreshQueue = []
            config.headers.Authorization = `Bearer ${newToken}`
            config.headers['X-Tenant-Id'] = getTenantId()
            return service(config)
          } catch {
            isRefreshing = false
            refreshQueue.forEach(({ reject }) => reject(new Error('刷新失败')))
            refreshQueue = []
            ElMessage.error('登录已过期，请重新登录')
            redirectToLogin()
          }
        } else {
          return new Promise((resolve, reject) => {
            refreshQueue.push({
              resolve: (token: string) => {
                config.headers.Authorization = `Bearer ${token}`
                config.headers['X-Tenant-Id'] = getTenantId()
                resolve(service(config))
              },
              reject,
            })
          })
        }
        break
      }
      case 403:
        ElMessage.error('没有操作权限')
        break
      case 404:
        ElMessage.error(getResponseMessage(data, '请求的资源不存在'))
        break
      case 500:
        ElMessage.error('服务器内部错误')
        break
      default:
        ElMessage.error(getResponseMessage(data, `请求失败 (${status})`))
    }

    return Promise.reject(error)
  },
)

function request<T = any>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
  return service(config) as Promise<ApiResponse<T>>
}

export { service as axiosInstance }
export default request
