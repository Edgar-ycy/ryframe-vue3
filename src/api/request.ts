import axios, { type AxiosResponse, type InternalAxiosRequestConfig, type AxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import { getToken, removeToken, getRefreshToken, setToken, setRefreshToken } from '@/utils/auth'
import { refreshToken as refreshTokenApi } from '@/api/modules/auth'

// 后端统一响应结构
export interface ApiResponse<T = any> {
  code: number
  data: T
  /** 后端返回的消息字段为 msg */
  msg: string
  /** 分页数据（由拦截器从 data.rows 提升到顶层，方便视图访问） */
  rows?: any[]
  /** 分页总数（由拦截器从 data.total 提升到顶层，方便视图访问） */
  total?: number
}

// 创建 Axios 实例
const service = axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_API,  // /api/v1
  timeout: 15000,                                // 15 秒超时
  headers: { 'Content-Type': 'application/json' },
})

// 是否正在刷新 token
let isRefreshing = false
// 刷新 token 期间暂存的请求队列
let refreshQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = []

/** 执行刷新 token */
async function doRefreshToken(): Promise<string> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) throw new Error('无刷新令牌')
  const res = await refreshTokenApi({ refresh_token: refreshToken }) as any
  const newToken = res.data?.access_token || res.access_token
  const newRefreshToken = res.data?.refresh_token || res.refresh_token
  if (!newToken) throw new Error('刷新令牌失败')
  setToken(newToken)
  if (newRefreshToken) setRefreshToken(newRefreshToken)
  return newToken
}

/** 跳转到登录页 */
function redirectToLogin() {
  removeToken()
  // 使用动态 import 避免循环依赖
  import('@/router').then(({ default: router }) => {
    router.push('/login').then()
  })
}

// ========== 请求拦截器 ==========
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ========== 响应拦截器 ==========
service.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { data } = response

    // 文件下载（blob 类型）直接返回
    if (response.config.responseType === 'blob') {
      return response as any
    }

    // 业务成功
    if (data.code === 200) {
      // 将分页数据从 data.data 提升到顶层，方便视图通过 res.rows / res.total 访问
      const result: any = { ...data }
      if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
        if ('rows' in data.data) result.rows = data.data.rows
        if ('total' in data.data) result.total = data.data.total
      }
      return result
    }

    // 业务错误（400 / 409 等）
    ElMessage.error(data.msg || '请求失败')
    return Promise.reject(new Error(data.msg || 'Error'))
  },
  async (error) => {
    // HTTP 错误（无 response 对象）
    if (!error.response) {
      ElMessage.error('网络异常，请检查连接')
      return Promise.reject(error)
    }

    const { status, data, config } = error.response

    switch (status) {
      case 400:
        ElMessage.error(data?.msg || data?.message || '请求参数错误')
        break
      case 401: {
        // 登录页上的 401 仅提示，不清除 token
        if (window.location.pathname === '/login') {
          ElMessage.error(data?.msg || data?.message || '请求失败')
          break
        }
        // 排除刷新令牌接口本身（防止死循环）
        if (config.url?.includes('/auth/refresh')) {
          redirectToLogin()
          break
        }

        // 尝试用 refresh_token 刷新
        if (!isRefreshing) {
          isRefreshing = true
          try {
            const newToken = await doRefreshToken()
            isRefreshing = false
            // 重放队列中的请求
            refreshQueue.forEach(({ resolve }) => resolve(newToken))
            refreshQueue = []
            // 重试原请求
            config.headers.Authorization = `Bearer ${newToken}`
            return service(config)
          } catch {
            isRefreshing = false
            refreshQueue.forEach(({ reject }) => reject(new Error('刷新失败')))
            refreshQueue = []
            ElMessage.error('登录已过期，请重新登录')
            redirectToLogin()
          }
        } else {
          // 正在刷新中，将请求加入队列
          return new Promise((resolve, reject) => {
            refreshQueue.push({
              resolve: (token: string) => {
                config.headers.Authorization = `Bearer ${token}`
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
        ElMessage.error(data?.msg || data?.message || '请求的资源不存在')
        break
      case 500:
        ElMessage.error('服务器内部错误')
        break
      default:
        ElMessage.error(data?.msg || data?.message || `请求失败 (${status})`)
    }

    return Promise.reject(error)
  },
)

/** 类型安全的请求封装（响应拦截器已解包 AxiosResponse → ApiResponse） */
function request<T = any>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
  return service(config) as Promise<ApiResponse<T>>
}

export { service as axiosInstance }
export default request
